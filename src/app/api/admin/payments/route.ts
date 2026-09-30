import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).single()
  return data ? user : null
}

// POST: 会計を記録
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const adminDb  = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminDb as any
  const user = await checkAdmin(supabase)
  if (!user) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const body = await request.json()
  const {
    reservation_id,
    customer_name,
    staff_name,
    menu_name,
    reservation_date,
    base_price,
    options,
    nomination_type,
    discount,
    total_amount,
    payment_method,
    cash_received,
    change_amount,
    notes,
    is_new_customer,
    age_group,
    next_visit_booked,
  } = body

  // 支払い記録を保存
  const { data: payment, error } = await db
    .from('payments')
    .insert({
      reservation_id,
      customer_name,
      staff_name,
      menu_name,
      reservation_date,
      base_price,
      options,
      nomination_type: nomination_type || null,
      discount,
      total_amount,
      payment_method,
      cash_received: payment_method === 'cash' ? cash_received : null,
      change_amount: payment_method === 'cash' ? change_amount : null,
      notes,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 予約ステータス + 顧客情報を更新
  await db
    .from('reservations')
    .update({
      status:            'completed',
      is_new_customer:   is_new_customer  ?? null,
      age_group:         age_group        || null,
      next_visit_booked: next_visit_booked ?? null,
    })
    .eq('id', reservation_id)

  return NextResponse.json(payment)
}

// GET: 支払い一覧取得
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  if (!await checkAdmin(supabase)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const adminDb = await createAdminClient()
  const { searchParams } = new URL(request.url)
  const from            = searchParams.get('from')
  const to              = searchParams.get('to')
  const reservationId   = searchParams.get('reservation_id')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (adminDb as any).from('payments').select('*').order('paid_at', { ascending: false })
  if (from)          query = query.gte('reservation_date', from)
  if (to)            query = query.lte('reservation_date', to)
  if (reservationId) query = query.eq('reservation_id', reservationId)

  const { data } = await query
  return NextResponse.json(data || [])
}
