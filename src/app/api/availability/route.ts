import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { timeToMinutes, minutesToTime } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const menuId = searchParams.get('menuId')
  const staffId = searchParams.get('staffId') || null

  if (!date || !menuId) {
    return NextResponse.json({ error: 'date and menuId are required' }, { status: 400 })
  }

  const supabase = await createClient()

  // メニュー情報取得
  const { data: menu } = await supabase
    .from('menus')
    .select('duration_minutes')
    .eq('id', menuId)
    .single()

  if (!menu) {
    return NextResponse.json({ error: 'Menu not found' }, { status: 404 })
  }

  // 設定取得
  const { data: settings } = await supabase.from('settings').select('*')
  const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]))

  const businessStart = settingsMap['business_start_time'] || '10:00'
  const lastCheckinTime = settingsMap['last_checkin_time'] || '23:00'
  const cutoffMinutes = parseInt(settingsMap['cutoff_minutes_before'] || '60')
  const slotInterval = parseInt(settingsMap['reservation_slot_minutes'] || '30')
  const totalBeds = parseInt(settingsMap['total_beds'] || '5')

  // 既存予約取得（指定日）
  let reservationQuery = supabase
    .from('reservations')
    .select('staff_id, start_time, end_time')
    .eq('reservation_date', date)
    .eq('status', 'confirmed')

  if (staffId) {
    reservationQuery = reservationQuery.eq('staff_id', staffId)
  }

  const { data: existingReservations } = await reservationQuery

  // スタッフ一覧取得
  const { data: allStaff } = await supabase
    .from('staff')
    .select('id')
    .eq('active', true)

  const staffIds = staffId ? [staffId] : (allStaff || []).map((s) => s.id)

  // 全予約取得（ベッド数制限チェック用）
  const { data: allReservationsForDate } = await supabase
    .from('reservations')
    .select('staff_id, start_time, end_time')
    .eq('reservation_date', date)
    .eq('status', 'confirmed')

  // スロット生成
  const startMinutes = timeToMinutes(businessStart)
  const lastCheckinMinutes = timeToMinutes(lastCheckinTime)
  const endSlotMinutes = lastCheckinMinutes // 最終受付時間まで

  const now = new Date()
  const reservationDate = new Date(date)
  const isToday = reservationDate.toDateString() === now.toDateString()

  const slots: { time: string; endTime: string; available: boolean }[] = []

  for (
    let minutes = startMinutes;
    minutes <= endSlotMinutes - menu.duration_minutes;
    minutes += slotInterval
  ) {
    const slotTime = minutesToTime(minutes)
    const slotEndTime = minutesToTime(minutes + menu.duration_minutes)

    // 締め切り時間チェック
    let isCutoffPassed = false
    if (isToday) {
      const slotDateTime = new Date(date)
      const [h, m] = slotTime.split(':').map(Number)
      slotDateTime.setHours(h, m, 0, 0)
      const cutoffDateTime = new Date(slotDateTime.getTime() - cutoffMinutes * 60 * 1000)
      if (cutoffDateTime <= now) {
        isCutoffPassed = true
      }
    }

    // 指定スタッフが空いているかチェック
    let staffAvailable = true
    if (staffId) {
      const conflicting = (existingReservations || []).some((r) => {
        const rStart = timeToMinutes(String(r.start_time).slice(0, 5))
        const rEnd = timeToMinutes(String(r.end_time).slice(0, 5))
        return rStart < minutes + menu.duration_minutes && rEnd > minutes
      })
      if (conflicting) staffAvailable = false
    } else {
      // おまかせ：全スタッフの空き確認
      const busyStaffIds = new Set<string>()
      ;(allReservationsForDate || []).forEach((r) => {
        const rStart = timeToMinutes(String(r.start_time).slice(0, 5))
        const rEnd = timeToMinutes(String(r.end_time).slice(0, 5))
        if (rStart < minutes + menu.duration_minutes && rEnd > minutes) {
          busyStaffIds.add(r.staff_id)
        }
      })
      const availableStaffCount = staffIds.filter((id) => !busyStaffIds.has(id)).length
      if (availableStaffCount === 0) staffAvailable = false
    }

    // ベッド数チェック
    let bedAvailable = true
    const overlappingReservations = (allReservationsForDate || []).filter((r) => {
      const rStart = timeToMinutes(String(r.start_time).slice(0, 5))
      const rEnd = timeToMinutes(String(r.end_time).slice(0, 5))
      return rStart < minutes + menu.duration_minutes && rEnd > minutes
    })
    if (overlappingReservations.length >= totalBeds) {
      bedAvailable = false
    }

    slots.push({
      time: slotTime,
      endTime: slotEndTime,
      available: !isCutoffPassed && staffAvailable && bedAvailable,
    })
  }

  return NextResponse.json({ slots })
}
