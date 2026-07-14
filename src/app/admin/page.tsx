import { createClient, createAdminClient } from '@/lib/supabase/server'
import ScheduleGrid from '@/components/admin/ScheduleGrid'
import DateNavigation from '@/components/admin/DateNavigation'
import ManualReservationButton from '@/components/admin/ManualReservationButton'
import QuickRefusalBar from '@/components/admin/QuickRefusalBar'
import RegisterCheckBar from '@/components/admin/RegisterCheckBar'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface PageProps {
  searchParams: { date?: string }
}

export default async function AdminPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const targetDate = searchParams.date || format(new Date(), 'yyyy-MM-dd')
  const dayOfWeek = new Date(targetDate).getDay()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminDb as any
  const [r0, r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
    supabase.from('staff').select('*').eq('active', true).order('sort_order'),
    supabase
      .from('reservations')
      .select('*, menu:menus(name, duration_minutes, price, price_ex_tax), staff(name)')
      .eq('reservation_date', targetDate)
      .neq('status', 'cancelled')
      .order('start_time'),
    supabase.from('settings').select('*'),
    supabase.from('staff_day_offs').select('staff_id').eq('off_date', targetDate),
    supabase.from('staff_weekly_schedule').select('*').eq('day_of_week', dayOfWeek),
    supabase.from('staff_schedule_overrides').select('*').eq('override_date', targetDate),
    supabase.from('menus').select('*').eq('active', true).order('sort_order'),
    db.from('refusals').select('*').eq('refusal_date', targetDate).order('refusal_time'),
    db.from('payments').select('total_amount, base_price').eq('reservation_date', targetDate),
  ])
  const staff           = (r0.data || []) as any[]
  const reservations    = (r1.data || []) as any[]
  const settings        = (r2.data || []) as any[]
  const dayOffs         = (r3.data || []) as any[]
  const weeklySchedules = (r4.data || []) as any[]
  const overrides       = (r5.data || []) as any[]
  const menus           = (r6.data || []) as any[]
  const refusals        = (r7.data || []) as any[]
  const payments        = (r8.data || []) as any[]

  const settingsMap   = Object.fromEntries(settings.map((s: any) => [s.key, s.value]))
  const businessStart = settingsMap['business_start_time'] || '10:00'
  const lastCheckin   = settingsMap['last_checkin_time']   || '23:00'
  const slotInterval  = parseInt(settingsMap['reservation_slot_minutes'] || '30')

  const offStaffIds = dayOffs.map((d: any) => d.staff_id)
  const dayOffSet   = new Set(offStaffIds)
  const overrideMap = Object.fromEntries(overrides.map((o: any) => [o.staff_id, o]))
  const weeklyMap   = Object.fromEntries(weeklySchedules.map((w: any) => [w.staff_id, w]))

  const shiftInfoMap: Record<string, { isWorking: boolean; startTime: string; endTime: string }> = {}
  for (const s of staff || []) {
    const override = overrideMap[s.id]
    const weekly   = weeklyMap[s.id]
    const isDayOff = dayOffSet.has(s.id)

    if (override) {
      shiftInfoMap[s.id] = {
        isWorking: override.is_working && !isDayOff,
        startTime: override.start_time?.slice(0, 5) || businessStart,
        endTime:   override.end_time?.slice(0, 5)   || lastCheckin,
      }
    } else if (isDayOff) {
      shiftInfoMap[s.id] = { isWorking: false, startTime: businessStart, endTime: lastCheckin }
    } else if (weekly) {
      shiftInfoMap[s.id] = {
        isWorking: weekly.is_working,
        startTime: weekly.start_time?.slice(0, 5) || businessStart,
        endTime:   weekly.end_time?.slice(0, 5)   || lastCheckin,
      }
    } else {
      shiftInfoMap[s.id] = { isWorking: true, startTime: businessStart, endTime: lastCheckin }
    }
  }

  const allReservations  = reservations || []
  const completedCount   = allReservations.filter(r => r.status === 'completed').length
  const pendingCount     = allReservations.length - completedCount
  // 指名料・オプション・割引込みの実際の売上はpaymentsテーブルから集計
  const totalRevenue     = payments.reduce((s: number, p: any) => s + (p.total_amount || 0), 0)
  const totalRevenueEx   = Math.round(totalRevenue / 1.1)

  return (
    <div>

      {/* ── ページヘッダー ── */}
      <div className="mb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold leading-tight text-gray-900">
              予約管理表
            </h1>
            <p className="text-xs mt-1 text-gray-500">
              スタッフごとの予約状況を確認・管理できます
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/print?date=${targetDate}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              PDF出力
            </a>
            <ManualReservationButton
              staff={staff || []}
              menus={menus || []}
              targetDate={targetDate}
              businessStart={businessStart}
              lastCheckin={lastCheckin}
              slotInterval={slotInterval}
            />
          </div>
        </div>

        {/* 当日サマリー */}
        <div className="grid grid-cols-4 gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(3, 1fr) 1.3fr' }}>
          {([
            {
              label: '本日の予約',
              value: `${allReservations.length}件`,
              icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
              color: '#eff6ff',
              borderColor: '#bfdbfe',
              textColor: '#1e40af',
            },
            {
              label: '会計済み',
              value: `${completedCount}件`,
              icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
              color: '#f0fdf4',
              borderColor: '#bbf7d0',
              textColor: '#166534',
            },
            {
              label: '未会計',
              value: `${pendingCount}件`,
              icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
              color: '#fffbeb',
              borderColor: '#fde68a',
              textColor: '#92400e',
            },
          ] as const).map(item => (
            <div
              key={item.label}
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: item.color, border: `1px solid ${item.borderColor}` }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: item.textColor, opacity: 0.7 }}>
                  {item.label}
                </span>
                <span style={{ color: item.textColor, opacity: 0.7 }}>{item.icon}</span>
              </div>
              <div className="text-xl font-bold" style={{ color: item.textColor }}>
                {item.value}
              </div>
            </div>
          ))}
            {/* 本日売上カード（税込・税抜） */}
            <div
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: '#fdf2f8', border: '1px solid #f9a8d4' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: '#9d174d', opacity: 0.7 }}>本日の売上</span>
                <span style={{ color: '#9d174d', opacity: 0.7 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </span>
              </div>
              <div className="text-xl font-bold" style={{ color: '#9d174d' }}>
                ¥{totalRevenue.toLocaleString()}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#9d174d', opacity: 0.6 }}>
                税抜 ¥{totalRevenueEx.toLocaleString()}
              </div>
            </div>
        </div>

        {/* 日付ナビゲーション */}
        <DateNavigation currentDate={targetDate} />
      </div>

      {/* ── レジ金確認バー ── */}
      <RegisterCheckBar key={`regcheck-${targetDate}`} targetDate={targetDate} />

      {/* ── 断り記録バー ── */}
      <QuickRefusalBar key={targetDate} targetDate={targetDate} initialRefusals={refusals} />

      {/* ── スケジュールグリッド ── */}
      <ScheduleGrid
        staff={staff || []}
        menus={menus || []}
        reservations={allReservations as any[]}
        businessStart={businessStart}
        lastCheckin={lastCheckin}
        slotInterval={slotInterval}
        targetDate={targetDate}
        offStaffIds={offStaffIds}
        shiftInfoMap={shiftInfoMap}
      />
    </div>
  )
}
