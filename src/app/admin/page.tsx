import { createClient } from '@/lib/supabase/server'
import ScheduleGrid from '@/components/admin/ScheduleGrid'
import DateNavigation from '@/components/admin/DateNavigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface PageProps {
  searchParams: { date?: string }
}

export default async function AdminPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  const targetDate = searchParams.date || format(new Date(), 'yyyy-MM-dd')

  const [{ data: staff }, { data: reservations }, { data: settings }] = await Promise.all([
    supabase.from('staff').select('*').eq('active', true).order('sort_order'),
    supabase
      .from('reservations')
      .select('*, menu:menus(name, duration_minutes, price), staff(name)')
      .eq('reservation_date', targetDate)
      .neq('status', 'cancelled')
      .order('start_time'),
    supabase.from('settings').select('*'),
  ])

  const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]))
  const businessStart = settingsMap['business_start_time'] || '10:00'
  const lastCheckin = settingsMap['last_checkin_time'] || '23:00'
  const slotInterval = parseInt(settingsMap['reservation_slot_minutes'] || '30')

  const dateLabel = format(new Date(targetDate), 'yyyy年M月d日(EEE)', { locale: ja })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">予約スケジュール</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            予約数: <strong>{(reservations || []).length}件</strong>
          </span>
        </div>
      </div>

      <DateNavigation currentDate={targetDate} />

      <div className="mt-4 overflow-x-auto">
        <ScheduleGrid
          staff={staff || []}
          reservations={reservations || []}
          businessStart={businessStart}
          lastCheckin={lastCheckin}
          slotInterval={slotInterval}
          targetDate={targetDate}
        />
      </div>
    </div>
  )
}
