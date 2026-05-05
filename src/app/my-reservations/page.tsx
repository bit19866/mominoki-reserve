import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatPrice } from '@/lib/utils'
import CancelButton from '@/components/reservation/CancelButton'
import Link from 'next/link'

export default async function MyReservationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/my-reservations')
  }

  const { data: reservations } = await supabase
    .from('reservations')
    .select('*, staff(*), menu:menus(*)')
    .eq('user_id', user.id)
    .order('reservation_date', { ascending: true })
    .order('start_time', { ascending: true })

  const now = new Date()
  const upcoming = (reservations || []).filter(
    (r) =>
      r.status === 'confirmed' &&
      new Date(`${r.reservation_date}T${r.end_time}`) > now
  )
  const past = (reservations || []).filter(
    (r) =>
      r.status !== 'confirmed' ||
      new Date(`${r.reservation_date}T${r.end_time}`) <= now
  )

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; className: string }> = {
      confirmed: { label: '予約確定', className: 'bg-green-100 text-green-700' },
      cancelled: { label: 'キャンセル', className: 'bg-red-100 text-red-700' },
      completed: { label: '来店済み', className: 'bg-gray-100 text-gray-600' },
    }
    const { label, className } = map[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
    return (
      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
        {label}
      </span>
    )
  }

  const ReservationCard = ({
    r,
    showCancel,
  }: {
    r: (typeof reservations)[0] & { staff: any; menu: any }
    showCancel: boolean
  }) => {
    const canCancel =
      showCancel &&
      r.status === 'confirmed' &&
      new Date(`${r.reservation_date}T${r.start_time}`).getTime() - now.getTime() > 60 * 60 * 1000

    return (
      <div className="card p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-gray-900">{r.menu?.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(r.reservation_date)}
            </p>
            <p className="text-sm text-gray-500">
              {String(r.start_time).slice(0, 5)}〜{String(r.end_time).slice(0, 5)}
            </p>
          </div>
          <StatusBadge status={r.status} />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-500">
            担当：{r.staff?.name || 'おまかせ'}
          </div>
          <div className="font-bold text-pink-600">
            {formatPrice((r.menu?.price || 0) + (r.staff ? 1650 : 0))}
          </div>
        </div>

        {canCancel && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <CancelButton reservationId={r.id} />
          </div>
        )}
        {showCancel && r.status === 'confirmed' && !canCancel && (
          <p className="mt-2 text-xs text-gray-400">
            ※ 1時間前を過ぎているためキャンセルできません
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-bold text-gray-900">マイ予約</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 今後の予約 */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">今後の予約</h2>
          {upcoming.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-gray-500 mb-4">予約はありません</p>
              <Link href="/reserve" className="btn-primary text-sm inline-block">
                予約する
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((r) => (
                <ReservationCard key={r.id} r={r as any} showCancel={true} />
              ))}
            </div>
          )}
        </section>

        {/* 過去の予約 */}
        {past.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">過去の予約</h2>
            <div className="space-y-3">
              {past.map((r) => (
                <ReservationCard key={r.id} r={r as any} showCancel={false} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
