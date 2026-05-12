import { createClient } from '@/lib/supabase/server'
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

  if (isWorking) {
    // 出勤 → day_offレコードを削除
    await supabase
      .from('staff_day_offs')
      .delete()
      .eq('staff_id', staffId)
      .eq('off_date', date)
  } else {
    // 休み → day_offレコードを追加
    await supabase
      .from('staff_day_offs')
      .upsert({ staff_id: staffId, off_date: date })
  }

  return NextResponse.json({ success: true })
}
