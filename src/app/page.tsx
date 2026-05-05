import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: settings } = await supabase
    .from('settings')
    .select('*')

  const settingsMap = Object.fromEntries(
    (settings || []).map((s) => [s.key, s.value])
  )

  const storeName = settingsMap['store_name'] ?? 'りらくもみのき富士錦町店'
  const startTime = settingsMap['business_start_time'] ?? '10:00'
  const endTime = settingsMap['business_end_time'] ?? '24:00'
  const lastCheckin = settingsMap['last_checkin_time'] ?? '23:00'

  // 今日の予約確認
  let todayReservation = null
  if (user) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('reservations')
      .select('*, staff(*), menu:menus(*)')
      .eq('user_id', user.id)
      .eq('reservation_date', today)
      .eq('status', 'confirmed')
      .single()
    todayReservation = data
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌿</span>
            <span className="font-bold text-gray-900 text-sm leading-tight">
              りらくもみのき<br />
              <span className="font-normal text-xs text-gray-500">富士錦町店</span>
            </span>
          </div>
          <nav className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/my-reservations"
                  className="text-sm text-gray-600 hover:text-pink-600 transition-colors"
                >
                  予約確認
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ログアウト
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm bg-pink-600 hover:bg-pink-700 text-white px-4 py-1.5 rounded-lg transition-colors"
              >
                ログイン
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="bg-gradient-to-br from-pink-600 to-rose-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-pink-200 text-sm mb-2">オンライン予約</p>
          <h1 className="text-3xl font-bold mb-3">{storeName}</h1>
          <p className="text-pink-100 text-sm mb-8">
            営業時間 {startTime}〜{endTime}（最終受付 {lastCheckin}）
          </p>

          {todayReservation ? (
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6 max-w-sm mx-auto text-left">
              <p className="text-pink-200 text-xs mb-1">本日のご予約</p>
              <p className="font-bold">
                {(todayReservation as any).menu?.name}
              </p>
              <p className="text-sm text-pink-100">
                {String((todayReservation as any).start_time).slice(0,5)}〜
                {String((todayReservation as any).end_time).slice(0,5)}
                　担当：{(todayReservation as any).staff?.name} さん
              </p>
            </div>
          ) : (
            <Link
              href={user ? '/reserve' : '/auth/login?redirectTo=/reserve'}
              className="inline-block bg-white text-pink-600 font-bold px-10 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              今すぐ予約する
            </Link>
          )}
        </div>
      </section>

      {/* メニューカテゴリー紹介 */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">メニュー</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { name: '全身もみ', icon: '💆', from: '2,420', desc: '30分〜90分' },
            { name: 'アロマ', icon: '🌸', from: '6,980', desc: '30分〜130分' },
            { name: '足つぼ', icon: '👣', from: '2,980', desc: '20分〜60分' },
            { name: 'ハンド', icon: '🤲', from: '2,980', desc: '20分〜60分' },
            { name: 'タイ古式', icon: '🧘', from: '5,480', desc: '60分〜120分' },
            { name: '小顔整顔', icon: '✨', from: '6,500', desc: '60分〜90分' },
          ].map((cat) => (
            <Link
              key={cat.name}
              href={user ? '/reserve' : '/auth/login?redirectTo=/reserve'}
              className="card p-4 text-center hover:shadow-md transition-shadow hover:border-pink-200"
            >
              <div className="text-3xl mb-2">{cat.icon}</div>
              <p className="font-bold text-sm text-gray-900">{cat.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{cat.desc}</p>
              <p className="text-xs text-pink-600 font-medium mt-1">¥{cat.from}〜</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 店舗情報 */}
      <section className="max-w-4xl mx-auto px-4 pb-10">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">店舗情報</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex gap-4">
              <dt className="text-gray-500 w-20 shrink-0">店名</dt>
              <dd className="text-gray-900">{storeName}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-gray-500 w-20 shrink-0">営業時間</dt>
              <dd className="text-gray-900">{startTime}〜{endTime}（最終受付 {lastCheckin}）</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-gray-500 w-20 shrink-0">定休日</dt>
              <dd className="text-gray-900">年中無休</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-800 text-gray-400 text-center text-xs py-6">
        <p>© 2024 りらくもみのき富士錦町店</p>
      </footer>
    </div>
  )
}
