-- PediFlux · API (RPCs)
-- Tudo que não é CRUD simples do médico passa por aqui. Funções públicas (anon) nunca
-- devolvem dado de paciente, exceto o portal, que exige o token da própria família.

-- ---------------------------------------------------------------- onboarding (self-service)
-- Primeiro acesso após o cadastro: cria a clínica, vincula o usuário como dono e abre
-- 7 dias de teste com todos os recursos (plano pro). Uma clínica por conta.
create or replace function public.create_clinic(p_name text, p_slug text, p_doctor_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_clinic uuid;
  v_short text;
begin
  if v_uid is null then
    raise exception 'Faça login para continuar' using errcode = '42501';
  end if;
  if exists (select 1 from public.clinic_members where user_id = v_uid) then
    raise exception 'Esta conta já possui uma clínica' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.clinics where slug = lower(p_slug)) then
    raise exception 'Este endereço já está em uso, escolha outro' using errcode = '23505';
  end if;

  v_short := split_part(trim(p_doctor_name), ' ', 1) || ' ' ||
             coalesce(nullif(split_part(trim(p_doctor_name), ' ', 2), ''), '');

  insert into public.clinics (name, slug, doctor_name, doctor_short)
  values (trim(p_name), lower(trim(p_slug)), trim(p_doctor_name), trim(v_short))
  returning id into v_clinic;

  insert into public.clinic_members (clinic_id, user_id, role) values (v_clinic, v_uid, 'owner');

  insert into public.subscriptions (clinic_id, plan, status, trial_ends_at, provider)
  values (v_clinic, 'pro', 'trial', now() + interval '7 days', 'manual');

  return v_clinic;
end;
$$;

-- ---------------------------------------------------------------- agendamento público
-- Dados públicos da clínica + intervalos ocupados (sem nomes) para montar os horários livres.
create or replace function public.public_booking_info(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'clinic', jsonb_build_object(
      'name', c.name,
      'doctor_name', c.doctor_name,
      'doctor_short', c.doctor_short,
      'crm', c.crm,
      'specialty', c.specialty,
      'phone', c.phone,
      'address', c.address,
      'hours', c.hours,
      'default_duration', c.default_duration
    ),
    'busy', coalesce((
      select jsonb_agg(jsonb_build_object('date', b.d, 'start', b.s, 'end', b.e) order by b.d, b.s)
      from (
        select a.date as d, a.start_time as s, (a.start_time + make_interval(mins => a.duration)) as e
        from public.appointments a
        where a.clinic_id = c.id and a.status <> 'faltou'
          and a.date between current_date and current_date + 60
        union all
        select t.date, t.start_time, t.end_time
        from public.time_blocks t
        where t.clinic_id = c.id and t.date between current_date and current_date + 60
        union all
        select r.date, r.start_time, (r.start_time + make_interval(mins => c.default_duration))
        from public.booking_requests r
        where r.clinic_id = c.id and r.status = 'pendente'
          and r.date between current_date and current_date + 60
      ) b
    ), '[]'::jsonb)
  )
  from public.clinics c
  where c.slug = lower(p_slug) and private.subscription_ok(c.id);
$$;

create or replace function public.create_booking_request(
  p_slug text,
  p_guardian_name text,
  p_child_name text,
  p_child_birth date,
  p_phone text,
  p_reason text,
  p_date date,
  p_time time
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.clinics%rowtype;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_now timestamp := now() at time zone 'America/Sao_Paulo';
  v_day jsonb;
  v_end time;
  v_id uuid;
begin
  select * into c from public.clinics where slug = lower(p_slug);
  if not found or not private.subscription_ok(c.id) then
    raise exception 'Agenda indisponível' using errcode = 'P0002';
  end if;

  if p_date < v_now::date or p_date > v_now::date + 60 then
    raise exception 'Escolha uma data nos próximos 60 dias' using errcode = 'P0001';
  end if;
  if p_date = v_now::date and p_time < v_now::time then
    raise exception 'Este horário já passou' using errcode = 'P0001';
  end if;

  v_day := c.hours -> extract(dow from p_date)::int;
  v_end := p_time + make_interval(mins => c.default_duration);
  if not coalesce((v_day ->> 'enabled')::boolean, false)
     or p_time < (v_day ->> 'start')::time
     or v_end > (v_day ->> 'end')::time then
    raise exception 'Fora do horário de atendimento' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.clinic_id = c.id and a.date = p_date and a.status <> 'faltou'
      and p_time < a.start_time + make_interval(mins => a.duration) and v_end > a.start_time
  ) or exists (
    select 1 from public.time_blocks t
    where t.clinic_id = c.id and t.date = p_date and p_time < t.end_time and v_end > t.start_time
  ) or exists (
    select 1 from public.booking_requests r
    where r.clinic_id = c.id and r.date = p_date and r.status = 'pendente'
      and p_time < r.start_time + make_interval(mins => c.default_duration) and v_end > r.start_time
  ) then
    raise exception 'Horário acabou de ser ocupado, escolha outro' using errcode = 'P0001';
  end if;

  -- anti-spam simples: até 3 pedidos pendentes por telefone e 100 por clínica
  if (select count(*) from public.booking_requests
      where clinic_id = c.id and phone = v_phone and status = 'pendente') >= 3
     or (select count(*) from public.booking_requests
      where clinic_id = c.id and status = 'pendente') >= 100 then
    raise exception 'Muitos pedidos pendentes. Fale com o consultório pelo WhatsApp.' using errcode = 'P0001';
  end if;

  insert into public.booking_requests
    (clinic_id, guardian_name, child_name, child_birth, phone, reason, date, start_time)
  values
    (c.id, trim(p_guardian_name), trim(p_child_name), p_child_birth, v_phone,
     left(coalesce(trim(p_reason), ''), 500), p_date, p_time)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------- portal da família
-- Tudo que a família pode ver, em uma chamada. Só consultas/exames marcados como
-- compartilhados; sem anamnese nem exame físico.
create or replace function public.portal_snapshot(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.portal_links%rowtype;
  v jsonb;
begin
  select * into l from public.portal_links
  where token = p_token and revoked_at is null;
  if not found or not private.has_feature(l.clinic_id, 'portal') then
    return null;
  end if;

  update public.portal_links set last_seen_at = now() where id = l.id;

  select jsonb_build_object(
    'guardian', jsonb_build_object('name', f.guardian_name, 'relation', f.guardian_relation),
    'clinic', jsonb_build_object(
      'name', c.name, 'slug', c.slug, 'doctor_name', c.doctor_name,
      'doctor_short', c.doctor_short, 'phone', c.phone, 'address', c.address
    ),
    'children', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'sex', p.sex,
        'birth_date', p.birth_date,
        'gestational_weeks', p.gestational_weeks,
        'next_return', p.next_return,
        'measurements', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', m.id, 'date', m.measured_on, 'weight', m.weight, 'height', m.height, 'head', m.head
          ) order by m.measured_on)
          from public.measurements m where m.patient_id = p.id
        ), '[]'::jsonb),
        'consultations', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', k.id, 'date', k.date, 'type', k.type, 'diagnosis', k.diagnosis, 'plan', k.plan,
            'return_in', k.return_in, 'hr', k.hr, 'temp', k.temp, 'spo2', k.spo2, 'rr', k.rr
          ) order by k.date desc)
          from public.consultations k where k.patient_id = p.id and k.shared_with_family
        ), '[]'::jsonb),
        'appointments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id, 'date', a.date, 'time', a.start_time, 'type', a.type, 'status', a.status
          ) order by a.date, a.start_time)
          from public.appointments a
          where a.patient_id = p.id and a.date >= current_date
            and a.status not in ('faltou', 'atendido')
        ), '[]'::jsonb),
        'exams', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', e.id, 'name', e.name, 'kind', e.kind, 'category', e.category, 'date', e.taken_on
          ) order by e.taken_on desc)
          from public.exam_files e where e.patient_id = p.id and e.shared_with_family
        ), '[]'::jsonb)
      ) order by p.birth_date desc)
      from public.patients p where p.family_id = f.id
    ), '[]'::jsonb)
  ) into v
  from public.families f
  join public.clinics c on c.id = f.clinic_id
  where f.id = l.family_id;

  return v;
end;
$$;

-- Caminho do arquivo para a Edge Function gerar URL assinada (só o servidor chama).
create or replace function public.portal_exam_path(p_token text, p_exam uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select e.storage_path
  from public.portal_links l
  join public.patients p on p.family_id = l.family_id
  join public.exam_files e on e.patient_id = p.id
  where l.token = p_token and l.revoked_at is null and e.id = p_exam and e.shared_with_family
    and private.has_feature(l.clinic_id, 'portal');
$$;

-- ---------------------------------------------------------------- permissões das funções
revoke execute on function public.create_clinic(text, text, text) from public, anon;
grant execute on function public.create_clinic(text, text, text) to authenticated;

revoke execute on function public.public_booking_info(text) from public;
grant execute on function public.public_booking_info(text) to anon, authenticated;

revoke execute on function public.create_booking_request(text, text, text, date, text, text, date, time) from public;
grant execute on function public.create_booking_request(text, text, text, date, text, text, date, time) to anon, authenticated;

revoke execute on function public.portal_snapshot(text) from public;
grant execute on function public.portal_snapshot(text) to anon, authenticated;

revoke execute on function public.portal_exam_path(text, uuid) from public, anon, authenticated;
grant execute on function public.portal_exam_path(text, uuid) to service_role;

-- trigger utilitário não precisa ser chamável pela API
revoke execute on function public.set_updated_at() from public, anon, authenticated;
