-- 支払い記録テーブル
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete restrict,
  customer_name text,
  staff_name text,
  menu_name text,
  reservation_date date,
  base_price int not null,
  options jsonb not null default '[]',  -- [{name, price}]
  discount int not null default 0,
  total_amount int not null,
  payment_method text not null check (payment_method in ('cash', 'card', 'paypay', 'rakuten_pay')),
  cash_received int,
  change_amount int,
  notes text,
  paid_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

alter table public.payments enable row level security;

create policy "管理者のみ参照可能" on public.payments
  for select using (
    exists (select 1 from public.admin_users where user_id = auth.uid())
  );

create policy "管理者のみ操作可能" on public.payments
  for all using (
    exists (select 1 from public.admin_users where user_id = auth.uid())
  );
