import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { timeToMinutes } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const body = await request.json()
  const {
    userId,
    staffId,
    menuId,
    reservationDate,
    startTime,
    endTime,
    customerName,
    customerEmail,
    customerPhone,
  } = body

  if (userId !== user.id) {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 403 })
  }

  // 設定取得
  const { data: settings } = await supabase.from('settings').select('*')
  const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]))
  const cutoffMinutes = parseInt(settingsMap['cutoff_minutes_before'] || '60')
  const totalBeds = parseInt(settingsMap['total_beds'] || '5')

  // メニュー取得
  const { data: menu } = await supabase
    .from('menus')
    .select('duration_minutes')
    .eq('id', menuId)
    .single()

  if (!menu) {
    return NextResponse.json({ error: 'メニューが見つかりません' }, { status: 400 })
  }

  // 締め切り時間チェック
  const now = new Date()
  const slotDateTime = new Date(`${reservationDate}T${startTime}`)
  if (slotDateTime.getTime() - now.getTime() < cutoffMinutes * 60 * 1000) {
    return NextResponse.json({ error: '受付時間を過ぎています' }, { status: 400 })
  }

  // 1日1予約チェック
  const { data: existingToday } = await supabase
    .from('reservations')
    .select('id')
    .eq('user_id', userId)
    .eq('reservation_date', reservationDate)
    .eq('status', 'confirmed')
    .single()

  if (existingToday) {
    return NextResponse.json({ error: '1日1回のご予約となります' }, { status: 409 })
  }

  // 指定スタッフの場合、空き確認
  const startMinutes = timeToMinutes(startTime.slice(0, 5))
  const endMinutes = timeToMinutes(endTime.slice(0, 5))

  if (staffId) {
    const { data: staffConflict } = await supabase
      .from('reservations')
      .select('id')
      .eq('staff_id', staffId)
      .eq('reservation_date', reservationDate)
      .eq('status', 'confirmed')
      .lt('start_time', endTime)
      .gt('end_time', startTime)

    if (staffConflict && staffConflict.length > 0) {
      return NextResponse.json({ error: 'このスタッフはすでに予約が入っています' }, { status: 409 })
    }
  }

  // ベッド数チェック
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

  // おまかせの場合、空いているスタッフを自動アサイン
  let assignedStaffId = staffId
  if (!staffId) {
    const { data: allStaff } = await supabase
      .from('staff')
      .select('id')
      .eq('active', true)
      .order('sort_order')

    const { data: busyStaff } = await supabase
      .from('reservations')
      .select('staff_id')
      .eq('reservation_date', reservationDate)
      .eq('status', 'confirmed')
      .lt('start_time', endTime)
      .gt('end_time', startTime)

    const busyStaffIds = new Set((busyStaff || []).map((r) => r.staff_id))
    const freeStaff = (allStaff || []).filter((s) => !busyStaffIds.has(s.id))

    if (freeStaff.length === 0) {
      return NextResponse.json({ error: 'この時間帯に対応可能なスタッフがいません' }, { status: 409 })
    }

    assignedStaffId = freeStaff[0].id
  }

  // 予約作成
  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      user_id: userId,
      staff_id: assignedStaffId,
      menu_id: menuId,
      reservation_date: reservationDate,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '1日1回のご予約となります' }, { status: 409 })
    }
    console.error('Reservation error:', error)
    return NextResponse.json({ error: '予約の作成に失敗しました' }, { status: 500 })
  }

  // 確認メール送信（非同期、失敗しても予約は成功扱い）
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId: reservation.id }),
    })
  } catch (e) {
    console.error('Failed to send confirmation email:', e)
  }

  return NextResponse.json({ id: reservation.id, success: true })
}
