import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns'

async function getOwnerUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await (supabase as any)
    .from('admin_users').select('role').eq('user_id', user.id).single()
  if (!data || (data as any).role !== 'owner') return null
  return user
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  if (!await getOwnerUser(supabase)) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const period = new URL(request.url).searchParams.get('period') || 'month'
  const today = new Date()
  let from: Date, to: Date

  switch (period) {
    case 'today': from = today; to = today; break
    case 'week':
      from = startOfWeek(today, { weekStartsOn: 1 })
      to   = endOfWeek(today,   { weekStartsOn: 1 }); break
    case 'year':
      from = startOfYear(today); to = endOfYear(today); break
    default:
      from = startOfMonth(today); to = endOfMonth(today)
  }

  const fromStr = format(from, 'yyyy-MM-dd')
  const toStr   = format(to,   'yyyy-MM-dd')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // スタッフ一覧（報酬率含む）
  const { data: staffList } = await db
    .from('staff')
    .select('id, name, commission_rate')
    .eq('active', true)
    .order('sort_order')

  // 期間内の予約
  const { data: rows } = await db
    .from('reservations')
    .select('staff_id, menu:menus(price, price_ex_tax)')
    .gte('reservation_date', fromStr)
    .lte('reservation_date', toStr)
    .eq('status', 'confirmed')

  const reservations = ((rows || []) as any[])

  const result = ((staffList || []) as any[]).map((staff: any) => {
    const staffRows = reservations.filter(r => r.staff_id === staff.id)
    const count         = staffRows.length
    const revenue       = staffRows.reduce((s, r) => s + (r.menu?.price || 0), 0)
    const revenueExTax  = staffRows.reduce((s, r) => s + (r.menu?.price_ex_tax ?? 0), 0)
    const rate          = Number(staff.commission_rate) || 0
    const compensation       = Math.round(revenueExTax * rate)

    return {
      staffId:       staff.id,
      name:          staff.name,
      commissionRate: rate,
      count,
      revenue,
      revenueExTax,
      compensation,
    }
  })

  return NextResponse.json({ period: { from: fromStr, to: toStr }, staff: result })
}
