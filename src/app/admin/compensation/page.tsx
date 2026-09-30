import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import CompensationDashboard from '@/components/admin/compensation/CompensationDashboard'

export default async function CompensationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: adminUser } = await supabase
    .from('admin_users').select('role').eq('user_id', user.id).single() as { data: { role: string } | null }
  if (!adminUser || adminUser.role !== 'owner') redirect('/admin')

  const today = new Date()
  const from  = format(startOfMonth(today), 'yyyy-MM-dd')
  const to    = format(endOfMonth(today),   'yyyy-MM-dd')

  const { data: staffList } = await supabase
    .from('staff')
    .select('id, name, commission_rate')
    .eq('active', true)
    .order('sort_order') as { data: { id: string; name: string; commission_rate: number | null }[] | null }

  const { data: rows } = await supabase
    .from('reservations')
    .select('staff_id, menu:menus(price, price_ex_tax)')
    .gte('reservation_date', from)
    .lte('reservation_date', to)
    .eq('status', 'confirmed')

  const reservations = (rows || []) as any[]

  const initialData = {
    period: { from, to },
    staff: (staffList || []).map(staff => {
      const staffRows = reservations.filter(r => r.staff_id === staff.id)
      const count        = staffRows.length
      const revenue      = staffRows.reduce((s, r) => s + (r.menu?.price || 0), 0)
      const revenueExTax = staffRows.reduce((s, r) => s + (r.menu?.price_ex_tax ?? 0), 0)
      const rate         = Number(staff.commission_rate) || 0
      return {
        staffId: staff.id,
        name: staff.name,
        commissionRate: rate,
        count,
        revenue,
        revenueExTax,
        compensation: Math.round(revenueExTax * rate),
      }
    }),
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">報酬管理</h1>
      <CompensationDashboard initialData={initialData} />
    </div>
  )
}
