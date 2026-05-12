import { createClient } from '@/lib/supabase/server'
import StaffManager from '@/components/admin/StaffManager'

export default async function AdminStaffPage() {
  const supabase = await createClient()

  const [{ data: staff }, { data: settings }] = await Promise.all([
    supabase.from('staff').select('*').order('sort_order'),
    supabase.from('settings').select('*'),
  ])

  const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]))
  const defaultStart = settingsMap['business_start_time'] || '10:00'
  const defaultEnd = settingsMap['last_checkin_time'] || '23:00'

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">スタッフ管理</h1>
      <StaffManager
        initialStaff={staff || []}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
      />
    </div>
  )
}
