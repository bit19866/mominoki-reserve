import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReservationWizard from '@/components/reservation/ReservationWizard'

export default async function ReservePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/reserve')
  }

  // 今日の予約チェック
  const today = new Date().toISOString().split('T')[0]
  const { data: existingReservation } = await supabase
    .from('reservations')
    .select('id, reservation_date, start_time, menu:menus(name)')
    .eq('user_id', user.id)
    .eq('reservation_date', today)
    .eq('status', 'confirmed')
    .maybeSingle()

  // メニュー・スタッフ・設定を取得
  const [{ data: menus }, { data: staff }, { data: settings }, { data: profile }] =
    await Promise.all([
      supabase.from('menus').select('*').eq('active', true).order('sort_order'),
      supabase.from('staff').select('*').eq('active', true).order('sort_order'),
      supabase.from('settings').select('*'),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])

  const settingsMap = Object.fromEntries(
    (settings || []).map((s) => [s.key, s.value])
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <a href="/" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <h1 className="font-bold text-gray-900">オンライン予約</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {existingReservation ? (
          <div className="card p-6 text-center">
            <div className="text-4xl mb-3">📅</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">本日すでにご予約があります</h2>
            <p className="text-gray-600 text-sm mb-1">
              {existingReservation.reservation_date} {String(existingReservation.start_time).slice(0,5)}〜
            </p>
            <p className="text-gray-600 text-sm mb-6">
              {(existingReservation.menu as any)?.name}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              ※ お一人様1日1回のご予約となります
            </p>
            <div className="flex gap-3 justify-center">
              <a href="/my-reservations" className="btn-primary text-sm">
                予約を確認する
              </a>
              <a href="/" className="btn-secondary text-sm">
                トップへ戻る
              </a>
            </div>
          </div>
        ) : (
          <ReservationWizard
            menus={menus || []}
            staff={staff || []}
            settings={settingsMap}
            user={{ id: user.id, email: user.email || '' }}
            profile={profile}
          />
        )}
      </div>
    </div>
  )
}
