import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { timeToMinutes } from '@/lib/utils'

export type AvailabilityLevel = 'high' | 'medium' | 'low' | 'none' | 'past' | 'closed'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const menuId = searchParams.get('menuId')
  const staffId = searchParams.get('staffId') || null
  const days = parseInt(searchParams.get('days') || '7')

  if (!menuId) {
    return NextResponse.json({ error: 'menuId is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // メニュー取得
  const { data: menu } = await supabase
    .from('menus')
    .select('duration_minutes')
    .eq('id', menuId)
    .single()
  if (!menu) return NextResponse.json({ error: 'Menu not found' }, { status: 404 })

  // 設定取得
  const { data: settings } = await supabase.from('settings').select('*')
  const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]))
  const businessStart = settingsMap['business_start_time'] || '10:00'
  const lastCheckin = settingsMap['last_checkin_time'] || '23:00'
  const cutoffMinutes = parseInt(settingsMap['cutoff_minutes_before'] || '60')
  const totalBeds = parseInt(settingsMap['total_beds'] || '5')

  // 対象日付を生成
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const dates: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    )
  }

  // 休業日取得
  const { data: holidays } = await supabase
    .from('store_holidays')
    .select('holiday_date')
    .in('holiday_date', dates)
  const holidaySet = new Set((holidays || []).map((h) => h.holiday_date))

  // 予約取得（全対象日）
  const { data: allReservations } = await supabase
    .from('reservations')
    .select('reservation_date, start_time, end_time, staff_id')
    .in('reservation_date', dates)
    .eq('status', 'confirmed')

  // スタッフ取得
  const { data: allStaff } = await supabase
    .from('staff')
    .select('id')
    .eq('active', true)

  // 休み取得
  const { data: dayOffs } = await supabase
    .from('staff_day_offs')
    .select('staff_id, off_date')
    .in('off_date', dates)

  // 時間ラベル生成（1時間ごと）
  const startMin = timeToMinutes(businessStart)
  const lastMin = timeToMinutes(lastCheckin)
  const hours: string[] = []
  for (let m = startMin; m <= lastMin - menu.duration_minutes; m += 60) {
    hours.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:00`)
  }

  // マトリクス計算
  const matrix: Record<string, Record<string, AvailabilityLevel>> = {}

  for (const date of dates) {
    matrix[date] = {}

    // 休業日
    if (holidaySet.has(date)) {
      for (const hour of hours) matrix[date][hour] = 'closed'
      continue
    }

    // この日の予約
    const dateReservations = (allReservations || []).filter(
      (r) => r.reservation_date === date
    )

    // この日の出勤スタッフ数
    const offIds = new Set(
      (dayOffs || []).filter((d) => d.off_date === date).map((d) => d.staff_id)
    )

    // staffId指定がある場合はそのスタッフが休みなら全て×
    if (staffId && offIds.has(staffId)) {
      for (const hour of hours) matrix[date][hour] = 'none'
      continue
    }

    const workingStaffCount = (allStaff || []).filter((s) => !offIds.has(s.id)).length
    const capacity = Math.min(totalBeds, staffId ? 1 : workingStaffCount)

    for (const hour of hours) {
      const hourMin = timeToMinutes(hour)

      // 締切チェック
      if (date === todayStr && hourMin <= nowMinutes + cutoffMinutes) {
        matrix[date][hour] = 'past'
        continue
      }

      // 重複予約数カウント
      const overlapping = dateReservations.filter((r) => {
        const rStart = timeToMinutes(String(r.start_time).slice(0, 5))
        const rEnd = timeToMinutes(String(r.end_time).slice(0, 5))
        // staffId指定の場合はそのスタッフの予約のみカウント
        if (staffId && r.staff_id !== staffId) return false
        return rStart < hourMin + menu.duration_minutes && rEnd > hourMin
      }).length

      const available = capacity - overlapping

      if (available <= 0) {
        matrix[date][hour] = 'none'
      } else if (available === 1) {
        matrix[date][hour] = 'low'
      } else if (available === 2) {
        matrix[date][hour] = 'medium'
      } else {
        matrix[date][hour] = 'high'
      }
    }
  }

  return NextResponse.json({ dates, hours, matrix })
}
