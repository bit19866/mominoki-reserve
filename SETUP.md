# りらくもみのき 予約システム セットアップガイド

## 必要なもの
- Node.js 18以上
- Supabaseアカウント
- Resendアカウント（メール送信用）
- Vercelアカウント（デプロイ用）

---

## 1. Supabase プロジェクト作成

1. https://supabase.com にアクセスしてプロジェクトを作成
2. `supabase/migrations/001_initial.sql` の内容をSQL Editorで実行
3. **Authentication > Providers** で以下を有効化：
   - Google（Google Cloud ConsoleでOAuth 2.0クライアントIDを作成）
   - Apple（Apple Developer Programが必要）
4. **Authentication > URL Configuration** で以下を設定：
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs に追加: `https://your-domain.vercel.app/auth/callback`

## 2. 管理者ユーザーの設定

Supabaseダッシュボードで最初の管理者を登録後、SQL Editorで実行：

```sql
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'your-admin@example.com';
```

## 3. 環境変数の設定

`.env.local` を作成（`.env.local.example` をコピー）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_xxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
CRON_SECRET=your-random-secret-for-cron
```

## 4. ローカル起動

```bash
npm install
npm run dev
```

## 5. Vercelデプロイ

```bash
# Vercel CLIを使う場合
npm i -g vercel
vercel

# または GitHubと連携してVercel Dashboardからデプロイ
```

**Vercel環境変数に上記の環境変数をすべて設定してください**

### Vercel Cron（リマインドメール）
`vercel.json` に設定済みです。日本時間20:00（UTC 11:00）に前日リマインドメールを送信します。

---

## ページ構成

| URL | 説明 |
|-----|------|
| `/` | トップページ |
| `/reserve` | 予約フロー（要ログイン） |
| `/my-reservations` | 予約確認・キャンセル（要ログイン） |
| `/auth/login` | ログインページ |
| `/admin` | 管理画面トップ（スケジュールグリッド） |
| `/admin/menus` | メニュー管理 |
| `/admin/staff` | スタッフ管理 |
| `/admin/settings` | 設定管理 |

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/availability` | GET | 空き時間照会 |
| `/api/reservations` | POST | 予約作成 |
| `/api/reservations/[id]/cancel` | POST | 予約キャンセル |
| `/api/email/confirmation` | POST | 予約確認メール送信 |
| `/api/email/reminder` | GET | リマインドメール送信（cron用） |

---

## 将来の決済機能追加について

`/admin/settings` の決済設定欄を拡張して、以下を追加できます：

1. `STRIPE_SECRET_KEY` 環境変数を追加
2. `/api/checkout` エンドポイントを作成
3. `reservations` テーブルに `payment_status`, `payment_intent_id` カラムを追加
4. `/reserve` の確認ステップにStripe Checkout/Elementsを組み込む
