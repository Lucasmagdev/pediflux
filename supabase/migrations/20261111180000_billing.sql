-- PediFlux · cobrança (Mercado Pago Assinaturas)
-- Fluxo: página de vendas → link do plano (preapproval_plan) → cliente paga →
-- webhook (Edge Function mp-webhook) → purchases + subscriptions.
-- Vínculo compra ↔ clínica é pelo e-mail: quem compra com um e-mail e cria a conta com o
-- mesmo e-mail já entra com o plano pago (sem trial).

alter table public.subscriptions drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('mercadopago', 'monetizze', 'hotmart', 'manual'));

-- Catálogo de planos vendidos. mp_plan_id/checkout_url são preenchidos ao criar o plano no MP.
create table public.billing_plans (
  code text primary key, -- ex.: plus_month
  tier public.plan_tier not null,
  billing_interval text not null check (billing_interval in ('month', 'year')),
  amount numeric(10, 2) not null check (amount > 0),
  mp_plan_id text unique,
  checkout_url text,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (tier, billing_interval)
);

insert into public.billing_plans (code, tier, billing_interval, amount) values
  ('essencial_month', 'essencial', 'month', 79.00),
  ('essencial_year', 'essencial', 'year', 790.00),
  ('plus_month', 'plus', 'month', 149.00),
  ('plus_year', 'plus', 'year', 1490.00),
  ('pro_month', 'pro', 'month', 279.00),
  ('pro_year', 'pro', 'year', 2790.00);

-- Compras recebidas do provedor (uma por assinatura). Só o servidor lê/escreve.
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  tier public.plan_tier not null,
  status text not null check (status in ('pending', 'authorized', 'paused', 'cancelled')),
  provider text not null default 'mercadopago',
  provider_subscription text not null unique,
  mp_plan_id text,
  next_payment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purchases_email_idx on public.purchases (lower(email));

alter table public.billing_plans enable row level security;
alter table public.purchases enable row level security;
-- preços e links são públicos (alimentam a página de vendas); compras não têm policy = só service_role.
create policy billing_plans_public_read on public.billing_plans for select to anon, authenticated
  using (active);
revoke all on public.purchases from anon, authenticated;
revoke insert, update, delete on public.billing_plans from anon, authenticated;

create trigger billing_plans_updated_at before update on public.billing_plans
  for each row execute function public.set_updated_at();
create trigger purchases_updated_at before update on public.purchases
  for each row execute function public.set_updated_at();

-- Aplica uma compra: registra e, se já existir clínica com esse e-mail, atualiza a assinatura.
create or replace function public.billing_apply(
  p_email text,
  p_tier public.plan_tier,
  p_status text,
  p_provider_subscription text,
  p_mp_plan text,
  p_next_payment timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic uuid;
begin
  insert into public.purchases (email, tier, status, provider_subscription, mp_plan_id, next_payment_at)
  values (lower(trim(p_email)), p_tier, p_status, p_provider_subscription, p_mp_plan, p_next_payment)
  on conflict (provider_subscription) do update
    set status = excluded.status,
        tier = excluded.tier,
        next_payment_at = excluded.next_payment_at;

  select m.clinic_id into v_clinic
  from auth.users u
  join public.clinic_members m on m.user_id = u.id and m.role = 'owner'
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_clinic is not null then
    update public.subscriptions s
    set plan = p_tier,
        status = case p_status
          when 'authorized' then 'active'::public.subscription_status
          when 'paused' then 'past_due'::public.subscription_status
          when 'cancelled' then 'canceled'::public.subscription_status
          else s.status
        end,
        provider = 'mercadopago',
        provider_subscription = p_provider_subscription,
        current_period_end = p_next_payment,
        trial_ends_at = case when p_status = 'authorized' then null else s.trial_ends_at end
    where s.clinic_id = v_clinic;
  end if;
end;
$$;

revoke execute on function public.billing_apply(text, public.plan_tier, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.billing_apply(text, public.plan_tier, text, text, text, timestamptz)
  to service_role;

-- O webhook precisa saber se o comprador já tem conta antes de convidá-lo.
create or replace function public.billing_user_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users where lower(email) = lower(trim(p_email)));
$$;
revoke execute on function public.billing_user_exists(text) from public, anon, authenticated;
grant execute on function public.billing_user_exists(text) to service_role;

-- create_clinic agora respeita uma compra já feita com o mesmo e-mail.
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
  v_email text;
  pur public.purchases%rowtype;
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

  select lower(email) into v_email from auth.users where id = v_uid;
  select * into pur from public.purchases
  where lower(email) = v_email and status in ('authorized', 'paused')
  order by updated_at desc limit 1;

  if found then
    insert into public.subscriptions
      (clinic_id, plan, status, provider, provider_subscription, current_period_end)
    values (
      v_clinic, pur.tier,
      case pur.status when 'authorized' then 'active'::public.subscription_status
                      else 'past_due'::public.subscription_status end,
      'mercadopago', pur.provider_subscription, pur.next_payment_at
    );
  else
    insert into public.subscriptions (clinic_id, plan, status, trial_ends_at, provider)
    values (v_clinic, 'pro', 'trial', now() + interval '7 days', 'manual');
  end if;

  return v_clinic;
end;
$$;
