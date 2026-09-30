-- 店舗休業日テーブル
create table if not exists public.store_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  reason text,
  created_at timestamptz default now()
);

alter table public.store_holidays enable row level security;

create policy "管理者のみ参照可能" on public.store_holidays
  for select using (
    exists (select 1 from public.admin_users where user_id = auth.uid())
  );

create policy "管理者のみ操作可能" on public.store_holidays
  for all using (
    exists (select 1 from public.admin_users where user_id = auth.uid())
  );
