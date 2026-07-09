-- admin_users に role カラム追加（owner / admin）
alter table public.admin_users
  add column if not exists role text not null default 'admin'
  check (role in ('owner', 'admin'));

-- staff に報酬率カラム追加（例: 0.40 = 40%）
alter table public.staff
  add column if not exists commission_rate numeric(4,2) not null default 0.00;

-- 既存の管理者を owner に昇格するには手動で実行:
-- update public.admin_users set role = 'owner' where user_id = '<your-user-id>';
