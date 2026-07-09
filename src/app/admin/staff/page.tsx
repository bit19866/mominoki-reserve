import { createClient } from '@/lib/supabase/server'
import StaffManager from '@/components/admin/StaffManager'

export default async function AdminStaffPage() {
  const supabase = await createClient()

  const [r0, r1] = await Promise.all([
    supabase.from('staff').select('*').order('sort_order'),
    supabase.from('settings').select('*'),
  ])
  const staff    = (r0.data || []) as any[]
  const settings = (r1.data || []) as any[]

  const settingsMap = Object.fromEntries(settings.map((s: any) => [s.key, s.value]))
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
