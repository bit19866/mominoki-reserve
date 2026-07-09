import { createClient } from '@/lib/supabase/server'
import ShiftCalendar from '@/components/admin/ShiftCalendar'
import { format } from 'date-fns'

interface PageProps {
  searchParams: { month?: string }
}

export default async function AdminShiftsPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  // 表示月（デフォルト：今月）
  const monthStr = searchParams.month || format(new Date(), 'yyyy-MM')
  const [year, month] = monthStr.split('-').map(Number)

  // 月の最初・最後の日
  const firstDay = `${monthStr}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const lastDayStr = `${monthStr}-${String(lastDay).padStart(2, '0')}`

  const [r0, r1, r2, r3] = await Promise.all([
    supabase.from('staff').select('*').eq('active', true).order('sort_order'),
    supabase.from('staff_schedule_overrides').select('*').gte('override_date', firstDay).lte('override_date', lastDayStr),
    supabase.from('staff_weekly_schedule').select('*'),
    supabase.from('settings').select('*'),
  ])
  const staff           = (r0.data || []) as any[]
  const overrides       = (r1.data || []) as any[]
  const weeklySchedules = (r2.data || []) as any[]
  const settings        = (r3.data || []) as any[]

  const settingsMap = Object.fromEntries(settings.map((s: any) => [s.key, s.value]))
  const defaultStart = settingsMap['business_start_time'] || '10:00'
  const defaultEnd = settingsMap['last_checkin_time'] || '23:00'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">シフト管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          各スタッフの出勤日・出勤時間を設定します。週間シフトをベースに、日別で上書きできます。
        </p>
      </div>

      <ShiftCalendar
        staff={staff || []}
        overrides={overrides || []}
        weeklySchedules={weeklySchedules || []}
        monthStr={monthStr}
        year={year}
        month={month}
        lastDay={lastDay}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
      />
    </div>
  )
}
