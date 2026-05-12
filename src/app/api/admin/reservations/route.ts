import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { timeToMinutes } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 管理者チェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .single()
  if (!adminUser) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const body = await request.json()
  const {
    staffId,
    menuId,
    reservationDate,
    startTime,
    endTime,
    customerName,
    gender,
    notes,
    source, // 'phone' | 'walkin'
  } = body

  // 必須チェック
  if (!staffId || !menuId || !reservationDate || !startTime || !endTime || !customerName) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  // スタッフの重複チェック
  const { data: staffConflict } = await supabase
    .from('reservations')
    .select('id')
    .eq('staff_id', staffId)
    .eq('reservation_date', reservationDate)
    .eq('status', 'confirmed')
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  if (staffConflict && staffConflict.length > 0) {
    return NextResponse.json(
      { error: 'この時間帯はすでに予約が入っています' },
      { status: 409 }
    )
  }

  // ベッド数チェック
  const { data: settings } = await supabase.from('settings').select('*')
  const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]))
  const totalBeds = parseInt(settingsMap['total_beds'] || '5')

  const { data: overlapping } = await supabase
    .from('reservations')
    .select('id')
    .eq('reservation_date', reservationDate)
    .eq('status', 'confirmed')
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  if (overlapping && overlapping.length >= totalBeds) {
    return NextResponse.json({ error: 'この時間帯は満席です' }, { status: 409 })
  }

  // 予約作成（user_idなし・管理者手入力）
  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      user_id: null,
      staff_id: staffId,
      menu_id: menuId,
      reservation_date: reservationDate,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
      customer_name: customerName,
      gender: gender || null,
      notes: notes || null,
      source: source || 'phone',
    })
    .select()
    .single()

  if (error) {
    console.error('Manual reservation error:', error)
    return NextResponse.json({ error: '予約の作成に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ id: reservation.id, success: true })
}
