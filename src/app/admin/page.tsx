import { createClient } from '@/lib/supabase/server'
import ScheduleGrid from '@/components/admin/ScheduleGrid'
import DateNavigation from '@/components/admin/DateNavigation'
import StaffAttendance from '@/components/admin/StaffAttendance'
import ShiftOverridePanel from '@/components/admin/ShiftOverridePanel'
import ManualReservationButton from '@/components/admin/ManualReservationButton'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface PageProps {
  searchParams: { date?: string }
}

export default async function AdminPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const targetDate = searchParams.date || format(new Date(), 'yyyy-MM-dd')
  const dayOfWeek = new Date(targetDate).getDay()

  const [
    { data: staff },
    { data: reservations },
    { data: settings },
    { data: dayOffs },
    { data: weeklySchedules },
    { data: overrides },
    { data: menus },
  ] = await Promise.all([
    supabase.from('staff').select('*').eq('active', true).order('sort_order'),
    supabase
      .from('reservations')
      .select('*, menu:menus(name, duration_minutes, price), staff(name)')
      .eq('reservation_date', targetDate)
      .neq('status', 'cancelled')
      .order('start_time'),
    supabase.from('settings').select('*'),
    supabase.from('staff_day_offs').select('staff_id').eq('off_date', targetDate),
    supabase
      .from('staff_weekly_schedule')
      .select('*')
      .eq('day_of_week', dayOfWeek),
    supabase
      .from('staff_schedule_overrides')
      .select('*')
      .eq('override_date', targetDate),
    supabase.from('menus').select('*').eq('active', true).order('sort_order'),
  ])

  const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]))
  const businessStart = settingsMap['business_start_time'] || '10:00'
  const lastCheckin = settingsMap['last_checkin_time'] || '23:00'
  const slotInterval = parseInt(settingsMap['reservation_slot_minutes'] || '30')

  const offStaffIds = (dayOffs || []).map((d) => d.staff_id)
  const dayOffSet = new Set(offStaffIds)
  const overrideMap = Object.fromEntries((overrides || []).map((o) => [o.staff_id, o]))
  const weeklyMap = Object.fromEntries((weeklySchedules || []).map((w) => [w.staff_id, w]))

  // 各スタッフのシフト情報を計算
  const shiftInfoMap: Record<string, { isWorking: boolean; startTime: string; endTime: string }> = {}
  for (const s of staff || []) {
    const override = overrideMap[s.id]
    const weekly = weeklyMap[s.id]
    const isDayOff = dayOffSet.has(s.id)

    if (override) {
      shiftInfoMap[s.id] = {
        isWorking: override.is_working && !isDayOff,
        startTime: override.start_time?.slice(0, 5) || businessStart,
        endTime: override.end_time?.slice(0, 5) || lastCheckin,
      }
    } else if (isDayOff) {
      shiftInfoMap[s.id] = { isWorking: false, startTime: businessStart, endTime: lastCheckin }
    } else if (weekly) {
      shiftInfoMap[s.id] = {
        isWorking: weekly.is_working,
        startTime: weekly.start_time?.slice(0, 5) || businessStart,
        endTime: weekly.end_time?.slice(0, 5) || lastCheckin,
      }
    } else {
      shiftInfoMap[s.id] = { isWorking: true, startTime: businessStart, endTime: lastCheckin }
    }
  }

  const dateLabel = format(new Date(targetDate), 'yyyy年M月d日(EEE)', { locale: ja })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">予約スケジュール</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            予約数: <strong>{(reservations || []).length}件</strong>
          </span>
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

      <DateNavigation currentDate={targetDate} />

      <div className="mt-4">
        <StaffAttendance
          staff={staff || []}
          targetDate={targetDate}
          initialOffStaffIds={offStaffIds}
        />
        <ShiftOverridePanel
          staff={staff || []}
          targetDate={targetDate}
          defaultStart={businessStart}
          defaultEnd={lastCheckin}
        />
      </div>

      <div className="overflow-x-auto">
        <ScheduleGrid
          staff={staff || []}
          menus={menus || []}
          reservations={reservations || []}
          businessStart={businessStart}
          lastCheckin={lastCheckin}
          slotInterval={slotInterval}
          targetDate={targetDate}
          offStaffIds={offStaffIds}
          shiftInfoMap={shiftInfoMap}
        />
      </div>
    </div>
  )
}
