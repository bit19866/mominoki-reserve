import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ─── 管理者チェック共通処理 ────────────────────────────────────────────────────
async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: adminUser } = await supabase
    .from('admin_users').select('user_id').eq('user_id', user.id).single()
  return !!adminUser
}

// ─── PATCH: 予約を編集 ─────────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const { id } = params
  const { staffId, menuId, startTime, endTime, customerName, gender, notes, source } =
    await request.json()

  if (!staffId || !menuId || !startTime || !endTime || !customerName) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  // 編集対象の予約日を取得
  const { data: current } = await supabase
    .from('reservations')
    .select('reservation_date')
    .eq('id', id)
    .single()

  if (!current) {
    return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 })
  }

  // スタッフの重複チェック（自分自身を除く）
  const { data: conflict } = await supabase
    .from('reservations')
    .select('id')
    .eq('staff_id', staffId)
    .eq('reservation_date', current.reservation_date)
    .eq('status', 'confirmed')
    .neq('id', id)
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  if (conflict && conflict.length > 0) {
    return NextResponse.json(
      { error: 'この時間帯はすでに別の予約が入っています' },
      { status: 409 },
    )
  }

  const { error } = await supabase
    .from('reservations')
    .update({
      staff_id:      staffId,
      menu_id:       menuId,
      start_time:    startTime,
      end_time:      endTime,
      customer_name: customerName,
      gender:        gender || null,
      notes:         notes  || null,
      source,
    })
    .eq('id', id)

  if (error) {
    console.error('Update reservation error:', error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// ─── DELETE: 予約を削除（キャンセル扱い） ──────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  if (!(await checkAdmin(supabase))) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', params.id)

  if (error) {
    console.error('Delete reservation error:', error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
