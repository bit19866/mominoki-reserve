import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import PrintSchedule from '@/components/admin/PrintSchedule'

interface PageProps {
  searchParams: { date?: string }
}

export default async function PrintPage({ searchParams }: PageProps) {
  const supabase   = await createClient()

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: adminUser } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).single()
  if (!adminUser) redirect('/')

  const targetDate = searchParams.date || format(new Date(), 'yyyy-MM-dd')
  const dayOfWeek  = new Date(targetDate).getDay()

  const db = supabase as any
  const [
    { data: staff },
    { data: reservations },
    { data: settings },
    { data: dayOffs },
    { data: weeklySchedules },
    { data: overrides },
    { data: refusals },
  ] = await Promise.all([
    supabase.from('staff').select('*').eq('active', true).order('sort_order'),
    supabase
      .from('reservations')
      .select('*, menu:menus(name, duration_minutes, price, price_ex_tax), staff:staff(name)')
      .eq('reservation_date', targetDate)
      .neq('status', 'cancelled')
      .order('start_time'),
    supabase.from('settings').select('*'),
    supabase.from('staff_day_offs').select('staff_id').eq('off_date', targetDate),
    supabase.from('staff_weekly_schedule').select('*').eq('day_of_week', dayOfWeek),
    supabase.from('staff_schedule_overrides').select('*').eq('override_date', targetDate),
    db.from('refusals').select('*').eq('refusal_date', targetDate).order('refusal_time'),
  ])

  const settingsMap   = Object.fromEntries((settings || []).map(s => [s.key, s.value]))
  const storeName     = settingsMap['store_name'] || 'りらくもみのき'
  const businessStart = settingsMap['business_start_time'] || '10:00'
  const lastCheckin   = settingsMap['last_checkin_time']   || '23:00'
  const dateLabel     = format(new Date(targetDate), 'yyyy年M月d日(EEE)', { locale: ja })

  const dayOffSet    = new Set((dayOffs || []).map(d => d.staff_id))
  const overrideMap  = Object.fromEntries((overrides || []).map(o => [o.staff_id, o]))
  const weeklyMap    = Object.fromEntries((weeklySchedules || []).map(w => [w.staff_id, w]))

  const shiftInfoMap: Record<string, { isWorking: boolean; startTime: string; endTime: string }> = {}
  for (const s of staff || []) {
    const override  = overrideMap[s.id]
    const weekly    = weeklyMap[s.id]
    const isDayOff  = dayOffSet.has(s.id)
    if (override) {
      shiftInfoMap[s.id] = { isWorking: override.is_working && !isDayOff, startTime: override.start_time?.slice(0,5) || businessStart, endTime: override.end_time?.slice(0,5) || lastCheckin }
    } else if (isDayOff) {
      shiftInfoMap[s.id] = { isWorking: false, startTime: businessStart, endTime: lastCheckin }
    } else if (weekly) {
      shiftInfoMap[s.id] = { isWorking: weekly.is_working, startTime: weekly.start_time?.slice(0,5) || businessStart, endTime: weekly.end_time?.slice(0,5) || lastCheckin }
    } else {
      shiftInfoMap[s.id] = { isWorking: true, startTime: businessStart, endTime: lastCheckin }
    }
  }

  return (
    <PrintSchedule
      storeName={storeName}
      dateLabel={dateLabel}
      targetDate={targetDate}
      reservations={(reservations || []) as any[]}
      staff={staff || []}
      shiftInfoMap={shiftInfoMap}
      businessStart={businessStart}
      lastCheckin={lastCheckin}
      refusals={(refusals || []) as any[]}
    />
  )
}
