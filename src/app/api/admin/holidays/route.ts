import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).single()
  return !!data
}

// GET: 休業日一覧取得
export async function GET() {
  const supabase = await createClient()
  if (!await checkAdmin(supabase)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { data } = await supabase
    .from('store_holidays')
    .select('*')
    .order('holiday_date')

  return NextResponse.json(data || [])
}

// POST: 休業日追加
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!await checkAdmin(supabase)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { date, reason } = await request.json()
  if (!date) return NextResponse.json({ error: '日付が必要です' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('store_holidays')
    .insert({ holiday_date: date, reason: reason || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE: 休業日削除
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  if (!await checkAdmin(supabase)) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { id } = await request.json()
  const { error } = await supabase.from('store_holidays').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
