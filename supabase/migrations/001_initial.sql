-- =====================================================
-- りらくもみのき 予約システム データベーススキーマ
-- =====================================================

-- プロフィールテーブル（auth.usersを拡張）
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  phone text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "自分のプロフィールのみ参照可能" on public.profiles
  for select using (auth.uid() = id);

create policy "自分のプロフィールのみ更新可能" on public.profiles
  for update using (auth.uid() = id);

create policy "プロフィール作成" on public.profiles
  for insert with check (auth.uid() = id);

-- 管理者テーブル（staffより先に作成）
create table if not exists public.admin_users (
  user_id uuid references auth.users(id) on delete cascade primary key,
  created_at timestamptz default now()
);

alter table public.admin_users enable row level security;

create policy "管理者自身のみ参照可能" on public.admin_users
  for select using (auth.uid() = user_id);

-- スタッフテーブル
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.staff enable row level security;

create policy "スタッフ情報は全員参照可能" on public.staff
  for select using (true);

create policy "管理者のみスタッフ操作可能" on public.staff
  for all using (
    exists (
      select 1 from public.admin_users where user_id = auth.uid()
    )
  );

-- メニューテーブル
create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes int not null,
  price int not null,
  category text default 'その他',
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.menus enable row level security;

create policy "メニューは全員参照可能" on public.menus
  for select using (true);

create policy "管理者のみメニュー操作可能" on public.menus
  for all using (
    exists (
      select 1 from public.admin_users where user_id = auth.uid()
    )
  );

-- 設定テーブル
create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table public.settings enable row level security;

create policy "設定は全員参照可能" on public.settings
  for select using (true);

create policy "管理者のみ設定変更可能" on public.settings
  for all using (
    exists (
      select 1 from public.admin_users where user_id = auth.uid()
    )
  );

-- 予約テーブル
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  staff_id uuid references public.staff(id) not null,
  menu_id uuid references public.menus(id) not null,
  reservation_date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  customer_name text,
  customer_email text,
  customer_phone text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.reservations enable row level security;

create policy "自分の予約のみ参照可能" on public.reservations
  for select using (auth.uid() = user_id);

create policy "自分の予約のみ作成可能" on public.reservations
  for insert with check (auth.uid() = user_id);

create policy "自分の予約のみキャンセル可能" on public.reservations
  for update using (auth.uid() = user_id);

create policy "管理者は全予約参照可能" on public.reservations
  for select using (
    exists (
      select 1 from public.admin_users where user_id = auth.uid()
    )
  );

create policy "管理者は全予約操作可能" on public.reservations
  for all using (
    exists (
      select 1 from public.admin_users where user_id = auth.uid()
    )
  );

-- ダブルブッキング防止：同日1予約制約
create unique index reservations_user_date_unique
  on public.reservations (user_id, reservation_date)
  where status != 'cancelled';

-- スタッフ×日時の重複防止
create unique index reservations_staff_datetime_unique
  on public.reservations (staff_id, reservation_date, start_time)
  where status != 'cancelled';

-- updated_atの自動更新
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reservations_updated_at
  before update on public.reservations
  for each row execute procedure public.handle_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- 新規ユーザー登録時にプロフィール自動作成
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- 初期データ投入
-- =====================================================

-- スタッフデータ
insert into public.staff (name, sort_order) values
  ('井出', 1),
  ('鈴木', 2),
  ('比嘉', 3),
  ('渡邉国', 4),
  ('伊藤', 5),
  ('荻野', 6),
  ('村松', 7),
  ('杉山', 8),
  ('山城', 9);

-- メニューデータ
insert into public.menus (name, duration_minutes, price, category, sort_order) values
  ('全身もみ30分', 30, 2420, '全身もみ', 1),
  ('全身もみ45分', 45, 3280, '全身もみ', 2),
  ('全身もみ60分', 60, 4380, '全身もみ', 3),
  ('全身もみ75分', 75, 4950, '全身もみ', 4),
  ('全身もみ90分', 90, 5980, '全身もみ', 5),
  ('足つぼ20分', 20, 2980, '足つぼ', 10),
  ('足つぼ40分', 40, 4280, '足つぼ', 11),
  ('足つぼ60分', 60, 4980, '足つぼ', 12),
  ('全足つぼ60分', 60, 4980, '全足つぼ', 13),
  ('全足つぼ90分', 90, 6500, '全足つぼ', 14),
  ('全足つぼ120分', 120, 8500, '全足つぼ', 15),
  ('ヘッド15分', 15, 2500, 'ヘッド', 20),
  ('ヘッド30分', 30, 3500, 'ヘッド', 21),
  ('セット105分', 105, 7500, 'セット', 25),
  ('セット120分', 120, 8600, 'セット', 26),
  ('ハンド20分', 20, 2980, 'ハンド', 30),
  ('ハンド40分', 40, 4280, 'ハンド', 31),
  ('ハンド60分', 60, 4980, 'ハンド', 32),
  ('全身ハンド60分', 60, 4980, '全身ハンド', 33),
  ('全身ハンド90分', 90, 6500, '全身ハンド', 34),
  ('全身ハンド120分', 120, 8500, '全身ハンド', 35),
  ('アロマ30分', 30, 6980, 'アロマ', 40),
  ('アロマ70分', 70, 11980, 'アロマ', 41),
  ('アロマ100分', 100, 15000, 'アロマ', 42),
  ('アロマ130分', 130, 16980, 'アロマ', 43),
  ('小顔整顔60分', 60, 6500, '小顔整顔', 50),
  ('小顔整顔90分', 90, 9500, '小顔整顔', 51),
  ('足技もみ30分', 30, 4500, '足技もみ', 55),
  ('足技もみ60分', 60, 6500, '足技もみ', 56),
  ('足技もみ90分', 90, 7500, '足技もみ', 57),
  ('足技もみ120分', 120, 9480, '足技もみ', 58),
  ('タイ古式60分', 60, 5480, 'タイ古式', 60),
  ('タイ古式90分', 90, 7500, 'タイ古式', 61),
  ('タイ古式120分', 120, 9480, 'タイ古式', 62),
  ('Sヘッド30分', 30, 3980, 'Sヘッド', 65),
  ('Sヘッド45分', 45, 4980, 'Sヘッド', 66),
  ('ふくらはぎ', 0, 880, 'オプション', 70),
  ('男女指名', 0, 1650, 'オプション', 71),
  ('個人指名', 0, 1650, 'オプション', 72),
  ('延長10分', 10, 1650, 'オプション', 73);

-- デフォルト設定
insert into public.settings (key, value) values
  ('business_start_time', '10:00'),
  ('business_end_time', '24:00'),
  ('last_checkin_time', '23:00'),
  ('cutoff_minutes_before', '60'),
  ('total_beds', '5'),
  ('store_name', 'りらくもみのき富士錦町店'),
  ('reservation_slot_minutes', '30');
