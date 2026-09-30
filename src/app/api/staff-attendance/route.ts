import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 指定日の出勤情報を取得
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: dayOffs } = await supabase
    .from('staff_day_offs')
    .select('staff_id')
    .eq('off_date', date)

  const offStaffIds = (dayOffs || []).map((d) => d.staff_id)

  return NextResponse.json({ offStaffIds })
}

// 出勤・休みを切り替え
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // 管理者チェック
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!adminUser) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const { staffId, date, isWorking } = await request.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = (await createAdminClient()) as any

  if (isWorking) {
    // 出勤 → day_offレコードを削除
    const { error } = await adminDb
      .from('staff_day_offs')
      .delete()
      .eq('staff_id', staffId)
      .eq('off_date', date)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // 休み → day_offレコードを追加
    const { error } = await adminDb
      .from('staff_day_offs')
      .upsert({ staff_id: staffId, off_date: date })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
