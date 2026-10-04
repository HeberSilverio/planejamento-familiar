-- =====================================================================
-- Planejamento Financeiro Familiar — esquema completo do banco
-- Pode ser executado manualmente em qualquer Postgres/Supabase.
-- Todas as tabelas financeiras possuem user_id e RLS por usuário.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
do $$ begin
  create type public.tx_kind as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.commitment_kind as enum ('recurring', 'installment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sim_item_kind as enum ('expense', 'income', 'debt');
exception when duplicate_object then null; end $$;

-- ---------- Função genérica de updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Configurações do usuário ----------
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid(),
  family_name text not null default 'Minha família',
  investment_target_pct numeric(5,2) not null default 30 check (investment_target_pct between 0 and 100),
  attention_threshold numeric(12,2) not null default 300,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Família ----------
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  birth_year int,
  role text,
  in_budget boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  member_id uuid references public.family_members(id) on delete set null,
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  in_budget boolean not null default true,
  start_date date not null default date_trunc('month', now())::date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  kind public.tx_kind not null default 'expense',
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, kind)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  credit_limit numeric(12,2) not null default 0,
  closing_day int check (closing_day between 1 and 31),
  due_day int check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lançamentos avulsos (realizados ou previstos)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  date date not null default current_date,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  kind public.tx_kind not null default 'expense',
  category_id uuid references public.categories(id) on delete set null,
  member_id uuid references public.family_members(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Despesas recorrentes mensais (água, luz, internet...)
create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  kind public.tx_kind not null default 'expense',
  category_id uuid references public.categories(id) on delete set null,
  day_of_month int check (day_of_month between 1 and 31),
  start_date date not null default date_trunc('month', now())::date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compromissos (parcelados ou recorrentes, ex.: cartões, empréstimos, CNPJ)
create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  kind public.commitment_kind not null default 'installment',
  installment_amount numeric(12,2) not null check (installment_amount >= 0),
  installments_total int check (installments_total is null or installments_total > 0),
  first_due_date date not null default current_date,
  due_day int check (due_day between 1 and 31),
  category_id uuid references public.categories(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  member_id uuid references public.family_members(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commitment_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  number int not null,
  due_date date not null,
  amount numeric(12,2) not null,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (commitment_id, number)
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  creditor text,
  total_amount numeric(12,2) not null default 0,
  installment_amount numeric(12,2) not null check (installment_amount >= 0),
  installments_total int not null check (installments_total > 0),
  installments_paid int not null default 0 check (installments_paid >= 0),
  first_due_date date not null default current_date,
  interest_rate numeric(6,3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debt_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  debt_id uuid not null references public.debts(id) on delete cascade,
  number int not null,
  due_date date not null,
  amount numeric(12,2) not null,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (debt_id, number)
);

create table if not exists public.planned_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  installments int not null default 1 check (installments > 0),
  priority int not null default 2 check (priority between 1 and 3),
  target_date date,
  purchased boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  type text not null default 'outro',
  monthly_contribution numeric(12,2) not null default 0,
  current_balance numeric(12,2) not null default 0,
  counts_toward_goal boolean not null default true,
  start_date date not null default date_trunc('month', now())::date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investment_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  investment_id uuid not null references public.investments(id) on delete cascade,
  date date not null default current_date,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0,
  monthly_contribution numeric(12,2) not null default 0,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Simulações: NUNCA alteram os dados reais
create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.simulation_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  simulation_id uuid not null references public.simulations(id) on delete cascade,
  kind public.sim_item_kind not null default 'expense',
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  months int not null default 0 check (months >= 0), -- 0 = permanente
  start_offset int not null default 0 check (start_offset >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Gamificação
create table if not exists public.gamification_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  member_id uuid not null references public.family_members(id) on delete cascade,
  xp int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id)
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  description text,
  xp_reward int not null default 10 check (xp_reward >= 0),
  reward text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  member_id uuid not null references public.family_members(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  member_id uuid references public.family_members(id) on delete cascade,
  title text not null,
  description text,
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Índices, grants, RLS, policies e triggers (todas as tabelas) ----------
do $$
declare t text;
begin
  foreach t in array array[
    'user_settings','family_members','income_sources','categories','accounts','credit_cards',
    'transactions','recurring_transactions','commitments','commitment_installments','debts',
    'debt_installments','planned_purchases','investments','investment_contributions',
    'financial_goals','simulations','simulation_items','gamification_profiles','missions',
    'member_missions','achievements'
  ] loop
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_idx', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own_select" on public.%I', t);
    execute format('drop policy if exists "own_insert" on public.%I', t);
    execute format('drop policy if exists "own_update" on public.%I', t);
    execute format('drop policy if exists "own_delete" on public.%I', t);
    execute format('create policy "own_select" on public.%I for select to authenticated using (auth.uid() = user_id)', t);
    execute format('create policy "own_insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t);
    execute format('create policy "own_update" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "own_delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', t);
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

create index if not exists transactions_date_idx on public.transactions (user_id, date);
create index if not exists simulation_items_sim_idx on public.simulation_items (simulation_id);
