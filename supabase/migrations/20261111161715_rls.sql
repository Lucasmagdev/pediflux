-- PediFlux · segurança por linha (RLS)
-- Regras de prateleira, iguais para todo cliente:
--   • membro da clínica lê os dados dela;
--   • só escreve com assinatura em dia (trial, active ou past_due) — cancelou, vira somente leitura
--     (os dados continuam da clínica e podem ser exportados; nada é apagado);
--   • prontuário (pacientes, famílias, consultas, medidas) não pode ser excluído: guarda legal;
--   • recursos extras dependem do plano (has_feature), nunca de configuração por cliente.

create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------- planos (fonte única)
create or replace function private.plan_allows(p_plan public.plan_tier, p_feature text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_feature
    when 'portal' then p_plan in ('plus', 'pro')
    when 'reports' then p_plan in ('plus', 'pro')
    when 'custom_templates' then p_plan = 'pro'
    else true
  end;
$$;

create or replace function private.plan_storage_bytes(p_plan public.plan_tier)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case p_plan
    when 'essencial' then 5::bigint * 1024 * 1024 * 1024
    when 'plus' then 20::bigint * 1024 * 1024 * 1024
    else 100::bigint * 1024 * 1024 * 1024
  end;
$$;

-- ---------------------------------------------------------------- helpers de acesso
create or replace function private.is_member(p_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clinic_members m
    where m.clinic_id = p_clinic and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.subscription_ok(p_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.clinic_id = p_clinic
      and (
        s.status in ('active', 'past_due')
        or (s.status = 'trial' and coalesce(s.trial_ends_at, now()) >= now())
      )
  );
$$;

create or replace function private.can_write(p_clinic uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_member(p_clinic) and private.subscription_ok(p_clinic);
$$;

create or replace function private.has_feature(p_clinic uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.subscription_ok(p_clinic) and exists (
    select 1 from public.subscriptions s
    where s.clinic_id = p_clinic and private.plan_allows(s.plan, p_feature)
  );
$$;

create or replace function private.uuid_or_null(p text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------- privilégios base
-- anon não toca em tabela nenhuma: acesso público é só por RPC (security definer).
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------- RLS
alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.families enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.consultations enable row level security;
alter table public.measurements enable row level security;
alter table public.time_blocks enable row level security;
alter table public.booking_requests enable row level security;
alter table public.exam_files enable row level security;
alter table public.portal_links enable row level security;

-- clínica: membro lê; dono/médico com assinatura em dia edita. Criação só via RPC create_clinic.
create policy clinics_select on public.clinics for select to authenticated
  using (private.is_member(id));
create policy clinics_update on public.clinics for update to authenticated
  using (
    private.can_write(id) and exists (
      select 1 from public.clinic_members m
      where m.clinic_id = id and m.user_id = (select auth.uid()) and m.role in ('owner', 'doctor')
    )
  )
  with check (private.can_write(id));

-- membros e assinatura: só leitura para o app (escrita pelo servidor).
create policy clinic_members_select on public.clinic_members for select to authenticated
  using (private.is_member(clinic_id));
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (private.is_member(clinic_id));

-- Prontuário: lê, cria e edita; NÃO exclui.
do $$
declare t text;
begin
  foreach t in array array['families', 'patients', 'consultations', 'measurements'] loop
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (private.is_member(clinic_id))', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (private.can_write(clinic_id))', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (private.can_write(clinic_id)) with check (private.can_write(clinic_id))', t);
  end loop;
end $$;

-- Operacional: CRUD completo.
do $$
declare t text;
begin
  foreach t in array array['appointments', 'time_blocks', 'exam_files'] loop
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (private.is_member(clinic_id))', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (private.can_write(clinic_id))', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (private.can_write(clinic_id)) with check (private.can_write(clinic_id))', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (private.can_write(clinic_id))', t);
  end loop;
end $$;

-- Pedidos de agendamento: entram pelo RPC público; a clínica lê e responde (update).
create policy booking_requests_select on public.booking_requests for select to authenticated
  using (private.is_member(clinic_id));
create policy booking_requests_update on public.booking_requests for update to authenticated
  using (private.can_write(clinic_id)) with check (private.can_write(clinic_id));

-- Portal da família: depende do plano.
create policy portal_links_select on public.portal_links for select to authenticated
  using (private.is_member(clinic_id));
create policy portal_links_insert on public.portal_links for insert to authenticated
  with check (private.can_write(clinic_id) and private.has_feature(clinic_id, 'portal'));
create policy portal_links_update on public.portal_links for update to authenticated
  using (private.can_write(clinic_id)) with check (private.can_write(clinic_id));

-- ---------------------------------------------------------------- cota de armazenamento por plano
create or replace function private.check_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used bigint;
  v_limit bigint;
begin
  select coalesce(sum(size_bytes), 0) into v_used
  from public.exam_files where clinic_id = new.clinic_id;

  select private.plan_storage_bytes(s.plan) into v_limit
  from public.subscriptions s where s.clinic_id = new.clinic_id;

  if v_used + new.size_bytes > coalesce(v_limit, 0) then
    raise exception 'Limite de armazenamento do plano atingido'
      using errcode = 'P0001', hint = 'Faça upgrade de plano para enviar mais arquivos.';
  end if;
  return new;
end;
$$;

create trigger exam_files_quota before insert on public.exam_files
  for each row execute function private.check_storage_quota();
