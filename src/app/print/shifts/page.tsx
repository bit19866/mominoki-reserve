import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import PrintShiftSchedule from '@/components/admin/PrintShiftSchedule'

interface PageProps {
  searchParams: { month?: string }
}

export default async function PrintShiftPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: adminUser } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).single()
  if (!adminUser) redirect('/login')

  const monthStr = searchParams.month || format(new Date(), 'yyyy-MM')
  const [year, month] = monthStr.split('-').map(Number)

  const firstDay   = `${monthStr}-01`
  const lastDay    = new Date(year, month, 0).getDate()
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

  const settingsMap  = Object.fromEntries(settings.map((s: any) => [s.key, s.value]))
  const storeName    = settingsMap['store_name'] || 'りらくもみのき'
  const defaultStart = settingsMap['business_start_time'] || '10:00'
  const defaultEnd   = settingsMap['last_checkin_time']   || '23:00'

  return (
    <PrintShiftSchedule
      storeName={storeName}
      monthStr={monthStr}
      year={year}
      month={month}
      lastDay={lastDay}
      staff={staff}
      overrides={overrides}
      weeklySchedules={weeklySchedules}
      defaultStart={defaultStart}
      defaultEnd={defaultEnd}
    />
  )
}
