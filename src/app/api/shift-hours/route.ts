import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const DAYS = ['日', '月', '火', '水', '木', '金', '土']

// 指定日のスタッフのシフト時間を取得
// 優先順位: 日別上書き > 週間シフト > 店舗デフォルト
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const staffId = searchParams.get('staffId')

  const supabase = await createClient()

  // 週間シフト一覧を取得（staffId指定なし＝全スタッフ）
  if (!date && staffId) {
    const { data } = await supabase
      .from('staff_weekly_schedule')
      .select('*')
      .eq('staff_id', staffId)
      .order('day_of_week')
    return NextResponse.json({ weeklySchedule: data || [] })
  }

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const dayOfWeek = new Date(date).getDay()

  // 設定取得（デフォルト時間）
  const { data: settings } = await supabase.from('settings').select('*')
  const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]))
  const defaultStart = settingsMap['business_start_time'] || '10:00'
  const defaultEnd = settingsMap['last_checkin_time'] || '23:00'

  // 全スタッフのシフト情報を取得
  const { data: allStaff } = await supabase
    .from('staff')
    .select('id, name')
    .eq('active', true)

  // 日別上書きを取得
  let overrideQuery = supabase
    .from('staff_schedule_overrides')
    .select('*')
    .eq('override_date', date)
  if (staffId) overrideQuery = overrideQuery.eq('staff_id', staffId)
  const { data: overrides } = await overrideQuery

  // 週間シフトを取得
  let weeklyQuery = supabase
    .from('staff_weekly_schedule')
    .select('*')
    .eq('day_of_week', dayOfWeek)
  if (staffId) weeklyQuery = weeklyQuery.eq('staff_id', staffId)
  const { data: weeklySchedules } = await weeklyQuery

  // day_offs（既存）を取得
  let dayOffQuery = supabase
    .from('staff_day_offs')
    .select('staff_id')
    .eq('off_date', date)
  if (staffId) dayOffQuery = dayOffQuery.eq('staff_id', staffId)
  const { data: dayOffs } = await dayOffQuery

  const dayOffSet = new Set((dayOffs || []).map((d) => d.staff_id))
  const overrideMap = Object.fromEntries((overrides || []).map((o) => [o.staff_id, o]))
  const weeklyMap = Object.fromEntries((weeklySchedules || []).map((w) => [w.staff_id, w]))

  const targetStaffs = staffId
    ? (allStaff || []).filter((s) => s.id === staffId)
    : (allStaff || [])

  const shiftInfo = targetStaffs.map((s) => {
    const override = overrideMap[s.id]
    const weekly = weeklyMap[s.id]
    const isDayOff = dayOffSet.has(s.id)

    // 優先順位に従って決定
    if (override) {
      return {
        staffId: s.id,
        staffName: s.name,
        isWorking: override.is_working && !isDayOff,
        startTime: override.start_time?.slice(0, 5) || defaultStart,
        endTime: override.end_time?.slice(0, 5) || defaultEnd,
        source: 'override',
      }
    }

    if (isDayOff) {
      return {
        staffId: s.id,
        staffName: s.name,
        isWorking: false,
        startTime: defaultStart,
        endTime: defaultEnd,
        source: 'day_off',
      }
    }

    if (weekly) {
      return {
        staffId: s.id,
        staffName: s.name,
        isWorking: weekly.is_working,
        startTime: weekly.start_time?.slice(0, 5) || defaultStart,
        endTime: weekly.end_time?.slice(0, 5) || defaultEnd,
        source: 'weekly',
      }
    }

    return {
      staffId: s.id,
      staffName: s.name,
      isWorking: true,
      startTime: defaultStart,
      endTime: defaultEnd,
      source: 'default',
    }
  })

  return NextResponse.json({ shiftInfo, dayOfWeek, dayName: DAYS[dayOfWeek] })
}

// 週間シフトを保存
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: adminUser } = await supabase
    .from('admin_users').select('user_id').eq('user_id', user.id).single()
  if (!adminUser) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const adminDb = await createAdminClient()
  const body = await request.json()
  const { type, staffId, dayOfWeek, isWorking, startTime, endTime, overrideDate } = body

  if (type === 'weekly') {
    const { error } = await (adminDb as any)
      .from('staff_weekly_schedule')
      .upsert({
        staff_id: staffId,
        day_of_week: dayOfWeek,
        is_working: isWorking,
        start_time: startTime || null,
        end_time: endTime || null,
      }, { onConflict: 'staff_id,day_of_week' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (type === 'override') {
    if (isWorking === null) {
      // 上書きを削除（デフォルトに戻す）
      await (adminDb as any)
        .from('staff_schedule_overrides')
        .delete()
        .eq('staff_id', staffId)
        .eq('override_date', overrideDate)
    } else {
      const { error } = await (adminDb as any)
        .from('staff_schedule_overrides')
        .upsert({
          staff_id: staffId,
          override_date: overrideDate,
          is_working: isWorking,
          start_time: startTime || null,
          end_time: endTime || null,
        }, { onConflict: 'staff_id,override_date' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'invalid type' }, { status: 400 })
}
