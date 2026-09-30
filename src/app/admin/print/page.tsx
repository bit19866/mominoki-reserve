import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import PrintSchedule from '@/components/admin/PrintSchedule'

interface PageProps {
  searchParams: { date?: string }
}

export default async function PrintPage({ searchParams }: PageProps) {
  const supabase   = await createClient()
  const targetDate = searchParams.date || format(new Date(), 'yyyy-MM-dd')
  const dayOfWeek  = new Date(targetDate).getDay()

  const db = supabase as any
  const [r0, r1, r2, r3, r4, r5, r6] = await Promise.all([
    supabase.from('staff').select('*').eq('active', true).order('sort_order'),
    supabase.from('reservations').select('*, menu:menus(name, duration_minutes, price), staff:staff(name)').eq('reservation_date', targetDate).neq('status', 'cancelled').order('start_time'),
    supabase.from('settings').select('*'),
    supabase.from('staff_day_offs').select('staff_id').eq('off_date', targetDate),
    supabase.from('staff_weekly_schedule').select('*').eq('day_of_week', dayOfWeek),
    supabase.from('staff_schedule_overrides').select('*').eq('override_date', targetDate),
    db.from('refusals').select('*').eq('refusal_date', targetDate).order('refusal_time'),
  ])
  const staff           = (r0.data || []) as any[]
  const reservations    = (r1.data || []) as any[]
  const settings        = (r2.data || []) as any[]
  const dayOffs         = (r3.data || []) as any[]
  const weeklySchedules = (r4.data || []) as any[]
  const overrides       = (r5.data || []) as any[]
  const refusals        = (r6.data || []) as any[]

  const settingsMap   = Object.fromEntries(settings.map((s: any) => [s.key, s.value]))
  const storeName     = settingsMap['store_name'] || 'りらくもみのき'
  const businessStart = settingsMap['business_start_time'] || '10:00'
  const lastCheckin   = settingsMap['last_checkin_time']   || '23:00'
  const dateLabel     = format(new Date(targetDate), 'yyyy年M月d日(EEE)', { locale: ja })

  const dayOffSet    = new Set(dayOffs.map((d: any) => d.staff_id))
  const overrideMap  = Object.fromEntries(overrides.map((o: any) => [o.staff_id, o]))
  const weeklyMap    = Object.fromEntries(weeklySchedules.map((w: any) => [w.staff_id, w]))

  // シフト情報
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
      refusals={refusals}
    />
  )
}
