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

  // 店舗休業日チェック
  const { data: holiday } = await supabase
    .from('store_holidays')
    .select('id')
    .eq('holiday_date', date)
    .maybeSingle()

  if (holiday) {
    return NextResponse.json({ slots: [], closed: true })
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

  // スタッフ一覧取得（休みのスタッフを除外）
  const { data: allStaff } = await supabase
    .from('staff')
    .select('id')
    .eq('active', true)

  const { data: dayOffs } = await supabase
    .from('staff_day_offs')
    .select('staff_id')
    .eq('off_date', date)

  const offStaffIdSet = new Set((dayOffs || []).map((d) => d.staff_id))

  // 指定スタッフが休みの場合はエラー
  if (staffId && offStaffIdSet.has(staffId)) {
    return NextResponse.json({ slots: [], error: 'このスタッフは本日休みです' })
  }

  const staffIds = staffId
    ? [staffId]
    : (allStaff || []).filter((s) => !offStaffIdSet.has(s.id)).map((s) => s.id)

  // シフト時間を取得（スタッフごとの出勤時間）
  const shiftRes = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/shift-hours?date=${date}`,
    { cache: 'no-store' }
  )
  const shiftData = await shiftRes.json()
  const shiftMap: Record<string, { startTime: string; endTime: string; isWorking: boolean }> = {}
  for (const s of shiftData.shiftInfo || []) {
    shiftMap[s.staffId] = { startTime: s.startTime, endTime: s.endTime, isWorking: s.isWorking }
  }

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
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const isToday = date === todayStr

  const slots: { time: string; endTime: string; available: boolean }[] = []

  for (
    let minutes = startMinutes;
    minutes <= endSlotMinutes - menu.duration_minutes;
    minutes += slotInterval
  ) {
    const slotTime = minutesToTime(minutes)
    const slotEndTime = minutesToTime(minutes + menu.duration_minutes)

    // 締め切り時間チェック（タイムゾーン問題を避けるため分単位で比較）
    let isCutoffPassed = false
    if (isToday) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      if (minutes <= nowMinutes + cutoffMinutes) {
        isCutoffPassed = true
      }
    }

    // 指定スタッフが空いているかチェック
    let staffAvailable = true
    if (staffId) {
      // シフト時間チェック
      const shift = shiftMap[staffId]
      if (shift) {
        if (!shift.isWorking) {
          staffAvailable = false
        } else {
          const shiftStart = timeToMinutes(shift.startTime)
          const shiftEnd = timeToMinutes(shift.endTime)
          if (minutes < shiftStart || minutes + menu.duration_minutes > shiftEnd) {
            staffAvailable = false
          }
        }
      }

      if (staffAvailable) {
        const conflicting = (existingReservations || []).some((r) => {
          const rStart = timeToMinutes(String(r.start_time).slice(0, 5))
          const rEnd = timeToMinutes(String(r.end_time).slice(0, 5))
          return rStart < minutes + menu.duration_minutes && rEnd > minutes
        })
        if (conflicting) staffAvailable = false
      }
    } else {
      // おまかせ：シフト時間内・空きスタッフの確認
      const busyStaffIds = new Set<string>()
      ;(allReservationsForDate || []).forEach((r) => {
        const rStart = timeToMinutes(String(r.start_time).slice(0, 5))
        const rEnd = timeToMinutes(String(r.end_time).slice(0, 5))
        if (rStart < minutes + menu.duration_minutes && rEnd > minutes) {
          busyStaffIds.add(r.staff_id)
        }
      })
      // シフト時間内かつ空きのスタッフ数を確認
      const availableStaffCount = staffIds.filter((id) => {
        if (busyStaffIds.has(id)) return false
        const shift = shiftMap[id]
        if (!shift) return true
        if (!shift.isWorking) return false
        const shiftStart = timeToMinutes(shift.startTime)
        const shiftEnd = timeToMinutes(shift.endTime)
        return minutes >= shiftStart && minutes + menu.duration_minutes <= shiftEnd
      }).length
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
