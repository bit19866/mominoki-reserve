import { createClient } from '@/lib/supabase/server'
import StaffManager from '@/components/admin/StaffManager'

export default async function AdminStaffPage() {
  const supabase = await createClient()
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .order('sort_order')

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">スタッフ管理</h1>
      <StaffManager initialStaff={staff || []} />
    </div>
  )
}
