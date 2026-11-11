-- PediFlux · esquema base (multi-tenant de prateleira)
-- Um único banco para todas as clínicas. Toda linha de dados carrega clinic_id;
-- FKs compostas (clinic_id, id) impedem que um registro aponte para outra clínica.

-- ---------------------------------------------------------------- tipos
create type public.plan_tier as enum ('essencial', 'plus', 'pro');
create type public.subscription_status as enum ('trial', 'active', 'past_due', 'canceled');
create type public.member_role as enum ('owner', 'doctor', 'secretary');
create type public.sex as enum ('M', 'F');
create type public.guardian_relation as enum ('Mãe', 'Pai', 'Responsável');
create type public.appointment_type as enum ('Puericultura', 'Doença aguda', 'Retorno', 'Vacina');
create type public.appointment_status as enum (
  'agendado', 'confirmado', 'aguardando', 'em_atendimento', 'atendido', 'faltou'
);
create type public.booking_status as enum ('pendente', 'confirmado', 'recusado');
create type public.exam_kind as enum ('pdf', 'image');
create type public.exam_category as enum (
  'Exame de sangue', 'Imagem', 'Laudo', 'Receita', 'Atestado', 'Outro'
);

-- ---------------------------------------------------------------- utilidades
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- tenancy
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  name text not null check (char_length(name) between 2 and 120),
  doctor_name text not null default '',
  doctor_short text not null default '',
  crm text not null default '',
  specialty text not null default 'Pediatria',
  phone text not null default '',
  address text not null default '',
  default_duration smallint not null default 30 check (default_duration between 10 and 120),
  -- índice 0 = domingo … 6 = sábado
  hours jsonb not null default '[
    {"enabled": false, "start": "08:00", "end": "12:00"},
    {"enabled": true,  "start": "08:00", "end": "18:00"},
    {"enabled": true,  "start": "08:00", "end": "18:00"},
    {"enabled": true,  "start": "08:00", "end": "18:00"},
    {"enabled": true,  "start": "08:00", "end": "18:00"},
    {"enabled": true,  "start": "08:00", "end": "18:00"},
    {"enabled": false, "start": "08:00", "end": "12:00"}
  ]'::jsonb check (jsonb_typeof(hours) = 'array' and jsonb_array_length(hours) = 7),
  messages jsonb not null default '{
    "reminder": "Olá, {responsavel}! Lembrando da consulta do(a) {paciente} {quando} às {hora} com a {medico}. Por favor, confirme respondendo esta mensagem.",
    "return": "Olá, {responsavel}! Está chegando a hora do retorno do(a) {paciente}. Vamos agendar? Responda com o melhor dia e horário.",
    "result": "Olá, {responsavel}! Os resultados dos exames do(a) {paciente} já estão disponíveis. Qualquer dúvida, estamos à disposição."
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinic_members (
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'doctor',
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);
create index clinic_members_user_idx on public.clinic_members (user_id);

-- Assinatura: escrita só pelo servidor (webhook de pagamento / service role).
create table public.subscriptions (
  clinic_id uuid primary key references public.clinics (id) on delete cascade,
  plan public.plan_tier not null default 'essencial',
  status public.subscription_status not null default 'trial',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  provider text check (provider in ('monetizze', 'hotmart', 'manual')),
  provider_customer text,
  provider_subscription text unique,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- domínio
-- Família = responsável + telefone. Irmãos compartilham a família (e o portal).
create table public.families (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  guardian_name text not null check (char_length(guardian_name) between 2 and 120),
  guardian_relation public.guardian_relation not null default 'Mãe',
  phone text not null check (phone ~ '^[0-9]{10,13}$'), -- só dígitos
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, id),
  unique (clinic_id, phone)
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  family_id uuid not null,
  name text not null check (char_length(name) between 2 and 120),
  birth_date date not null check (birth_date <= current_date),
  sex public.sex not null,
  gestational_weeks smallint check (gestational_weeks between 22 and 44),
  birth_weight numeric(5, 3) check (birth_weight > 0 and birth_weight < 10),
  birth_length numeric(4, 1) check (birth_length > 20 and birth_length < 70),
  allergies text[] not null default '{}',
  notes text,
  next_return date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, id),
  foreign key (clinic_id, family_id) references public.families (clinic_id, id)
);
create index patients_family_idx on public.patients (family_id);
create index patients_clinic_name_idx on public.patients (clinic_id, name);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null,
  date date not null,
  start_time time not null,
  duration smallint not null default 30 check (duration between 5 and 240),
  type public.appointment_type not null default 'Puericultura',
  reason text not null default '',
  status public.appointment_status not null default 'agendado',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, id),
  foreign key (clinic_id, patient_id) references public.patients (clinic_id, id)
);
create index appointments_clinic_date_idx on public.appointments (clinic_id, date, start_time);
create index appointments_patient_idx on public.appointments (patient_id, date);

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null,
  appointment_id uuid references public.appointments (id) on delete set null,
  date date not null,
  type public.appointment_type not null,
  complaint text not null default '',
  anamnesis text not null default '',
  exam text not null default '',
  diagnosis text not null default '',
  plan text not null default '',
  return_in text,
  -- sinais vitais
  hr smallint check (hr between 20 and 260),
  temp numeric(3, 1) check (temp between 30 and 45),
  spo2 smallint check (spo2 between 50 and 100),
  rr smallint check (rr between 5 and 120),
  shared_with_family boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, id),
  foreign key (clinic_id, patient_id) references public.patients (clinic_id, id)
);
create index consultations_patient_idx on public.consultations (patient_id, date desc);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null,
  consultation_id uuid references public.consultations (id) on delete set null,
  measured_on date not null,
  weight numeric(6, 3) check (weight > 0 and weight < 200),
  height numeric(5, 1) check (height > 20 and height < 220),
  head numeric(4, 1) check (head > 20 and head < 70),
  created_at timestamptz not null default now(),
  check (weight is not null or height is not null or head is not null),
  foreign key (clinic_id, patient_id) references public.patients (clinic_id, id)
);
create index measurements_patient_idx on public.measurements (patient_id, measured_on);

create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  label text not null default 'Bloqueio',
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index time_blocks_clinic_date_idx on public.time_blocks (clinic_id, date);

-- Pedidos vindos do link público (/agendar/:slug). Só entram via RPC.
create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  guardian_name text not null check (char_length(guardian_name) between 2 and 120),
  child_name text not null check (char_length(child_name) between 2 and 120),
  child_birth date not null check (child_birth <= current_date),
  phone text not null check (phone ~ '^[0-9]{10,13}$'),
  reason text not null default '' check (char_length(reason) <= 500),
  date date not null,
  start_time time not null,
  status public.booking_status not null default 'pendente',
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index booking_requests_clinic_idx on public.booking_requests (clinic_id, status, date);

create table public.exam_files (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null,
  name text not null check (char_length(name) between 1 and 200),
  kind public.exam_kind not null,
  category public.exam_category not null default 'Outro',
  taken_on date not null default current_date,
  storage_path text not null unique, -- exams/<clinic_id>/<patient_id>/<arquivo>
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  shared_with_family boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (clinic_id, patient_id) references public.patients (clinic_id, id)
);
create index exam_files_patient_idx on public.exam_files (patient_id, taken_on desc);

-- Link mágico do portal da família (sem senha). Um ativo por família.
create table public.portal_links (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  family_id uuid not null,
  token text not null unique default replace(replace(rtrim(
    encode(extensions.gen_random_bytes(24), 'base64'), '='), '+', '-'), '/', '_'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_seen_at timestamptz,
  foreign key (clinic_id, family_id) references public.families (clinic_id, id) on delete cascade
);
create unique index portal_links_one_active_idx on public.portal_links (family_id)
  where revoked_at is null;

-- ---------------------------------------------------------------- updated_at
create trigger clinics_updated_at before update on public.clinics
  for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
create trigger families_updated_at before update on public.families
  for each row execute function public.set_updated_at();
create trigger patients_updated_at before update on public.patients
  for each row execute function public.set_updated_at();
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();
create trigger consultations_updated_at before update on public.consultations
  for each row execute function public.set_updated_at();
