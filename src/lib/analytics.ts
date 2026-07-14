// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any

import {
  format,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  startOfYear, endOfYear,
  eachDayOfInterval,
} from 'date-fns'

export type Period = 'today' | 'week' | 'month' | 'year'

export interface DailySale    { date: string; revenue: number; count: number; refusalCount: number }
export interface GenderStat   { gender: string; label: string; count: number; revenue: number }
export interface MenuStat     { name: string; count: number; revenue: number }
export interface StaffStat    { name: string; count: number; revenue: number; revenueExTax: number; avgRevenue: number; avgRevenueExTax: number; nextVisitCount: number }
export interface HourlyStat   { hour: string; label: string; count: number }
export interface AgeGroupStat { group: string; count: number }

export interface NewRepeatStat {
  newCount: number
  repeatCount: number
  unknownCount: number
  repeatRate: number
}

export interface NextVisitStat {
  booked: number
  notBooked: number
  unknown: number
  rate: number
}

// 曜日別集計
export interface DowStat {
  day: number        // 0=日, 1=月, ..., 6=土
  label: string      // '日', '月', ...
  count: number      // 合計件数
  revenue: number    // 合計売上
  occurrences: number  // その曜日が何回あったか
  avgCount: number   // 1回あたり平均件数
}

// 稼働率
export interface OccupancyData {
  overall: number    // 0-100%
  daily: { date: string; rate: number; count: number }[]
}

export interface RefusalStat    { reason: string; count: number }
export interface RefusalSummary { total: number; breakdown: RefusalStat[] }

export interface AnalyticsData {
  period: { from: string; to: string }
  summary: {
    totalRevenue: number
    totalRevenueExTax: number
    totalReservations: number
    avgRevenue: number
    repeatRate: number
    nextVisitRate: number
    occupancyRate: number   // 稼働率 0-100%
  }
  dailySales: DailySale[]
  genderBreakdown: GenderStat[]
  menuBreakdown: MenuStat[]
  staffBreakdown: StaffStat[]
  hourlyBreakdown: HourlyStat[]
  newVsRepeat: NewRepeatStat
  ageGroupBreakdown: AgeGroupStat[]
  nextVisitStat: NextVisitStat
  dowBreakdown: DowStat[]
  occupancy: OccupancyData
  refusalSummary: RefusalSummary
}

const GENDER_LABELS: Record<string, string> = {
  male: '男性', female: '女性', other: 'その他', unknown: '未設定',
}
const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export const AGE_GROUPS = ['10代', '20代', '30代', '40代', '50代', '60代以上'] as const

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export async function computeAnalytics(
  supabase: AnySupabaseClient,
  period: Period = 'month',
  referenceDate?: Date,
): Promise<AnalyticsData> {
  const today = referenceDate ?? new Date()
  let from: Date, to: Date

  switch (period) {
    case 'today':
      from = today; to = today; break
    case 'week':
      from = startOfWeek(today, { weekStartsOn: 1 })
      to   = endOfWeek(today,   { weekStartsOn: 1 }); break
    case 'year':
      from = startOfYear(today); to = endOfYear(today); break
    default:
      from = startOfMonth(today); to = endOfMonth(today)
  }

  const fromStr = format(from, 'yyyy-MM-dd')
  const toStr   = format(to,   'yyyy-MM-dd')

  // 予約データ・設定・断りを並列取得
  const [{ data: rows }, { data: settings }, { data: refusalRows }] = await Promise.all([
    supabase
      .from('reservations')
      .select('reservation_date, start_time, end_time, gender, is_new_customer, age_group, next_visit_booked, menu:menus(name, price, price_ex_tax), staff:staff(name)')
      .gte('reservation_date', fromStr)
      .lte('reservation_date', toStr)
      .in('status', ['confirmed', 'completed']),
    supabase.from('settings').select('*'),
    supabase.from('refusals' as any).select('reason, refusal_date').gte('refusal_date', fromStr).lte('refusal_date', toStr),
  ])

  const data = (rows || []) as any[]
  const settingsMap = Object.fromEntries(((settings || []) as any[]).map((s: any) => [s.key, s.value]))

  // 稼働率計算に必要な設定値
  const totalBeds     = parseInt(settingsMap['total_beds'] || '5')
  const businessStart = settingsMap['business_start_time'] || '10:00'
  const lastCheckin   = settingsMap['last_checkin_time']   || '23:00'
  const businessMin   = timeToMin(lastCheckin) - timeToMin(businessStart) // 営業時間（分）
  const maxPerDay     = totalBeds * Math.floor(businessMin / 60)  // 1日の最大施術数（ベッド数 × 営業時間÷60）

  // ── Summary ──────────────────────────────────────────
  const totalRevenue      = data.reduce((s, r) => s + (r.menu?.price || 0), 0)
  const totalRevenueExTax = data.reduce((s, r) => s + (r.menu?.price_ex_tax ?? 0), 0)
  const totalReservations = data.length
  const avgRevenue        = totalReservations > 0 ? Math.round(totalRevenue / totalReservations) : 0

  // ── New vs Repeat ─────────────────────────────────────
  let newCount = 0, repeatCount = 0, unknownNR = 0
  data.forEach(r => {
    if (r.is_new_customer === true)       newCount++
    else if (r.is_new_customer === false) repeatCount++
    else                                  unknownNR++
  })
  const knownNR    = newCount + repeatCount
  const repeatRate = knownNR > 0 ? Math.round((repeatCount / knownNR) * 100) : 0
  const newVsRepeat: NewRepeatStat = { newCount, repeatCount, unknownCount: unknownNR, repeatRate }

  // ── Next visit booking ────────────────────────────────
  let nvBooked = 0, nvNotBooked = 0, nvUnknown = 0
  data.forEach(r => {
    if (r.next_visit_booked === true)       nvBooked++
    else if (r.next_visit_booked === false) nvNotBooked++
    else                                    nvUnknown++
  })
  const knownNV       = nvBooked + nvNotBooked
  const nextVisitRate = knownNV > 0 ? Math.round((nvBooked / knownNV) * 100) : 0
  const nextVisitStat: NextVisitStat = { booked: nvBooked, notBooked: nvNotBooked, unknown: nvUnknown, rate: nextVisitRate }

  // ── Daily sales ───────────────────────────────────────
  const dailyMap = new Map<string, { revenue: number; count: number }>()
  eachDayOfInterval({ start: from, end: to }).forEach(d =>
    dailyMap.set(format(d, 'yyyy-MM-dd'), { revenue: 0, count: 0 })
  )
  data.forEach(r => {
    const e = dailyMap.get(r.reservation_date) || { revenue: 0, count: 0 }
    dailyMap.set(r.reservation_date, {
      revenue: e.revenue + (r.menu?.price || 0),
      count:   e.count + 1,
    })
  })

  // 断り件数（日別）
  const refusalPerDayMap = new Map<string, number>()
  const refusals = (refusalRows || []) as any[]
  refusals.forEach(r => {
    const date = r.refusal_date as string
    if (date) refusalPerDayMap.set(date, (refusalPerDayMap.get(date) || 0) + 1)
  })

  const dailySales = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v, refusalCount: refusalPerDayMap.get(date) || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ── Occupancy rate（稼働率）: 施術件数 ÷ 1日最大施術数 ────────────────
  const occupancyDaily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({
      date,
      rate:  maxPerDay > 0 ? Math.min(100, Math.round((v.count / maxPerDay) * 100)) : 0,
      count: v.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalCount    = data.length
  const dayCount      = occupancyDaily.length
  const occupancyRate = (maxPerDay * dayCount) > 0
    ? Math.min(100, Math.round((totalCount / (maxPerDay * dayCount)) * 100))
    : 0

  const occupancy: OccupancyData = { overall: occupancyRate, daily: occupancyDaily }

  // ── Day of week breakdown（曜日別） ──────────────────
  // 期間内にその曜日が何回あったか
  const dowCountMap  = new Map<number, number>() // day -> total reservations
  const dowRevenueMap= new Map<number, number>() // day -> total revenue
  const dowOccMap    = new Map<number, number>() // day -> occurrences in period
  for (let d = 0; d < 7; d++) {
    dowCountMap.set(d, 0)
    dowRevenueMap.set(d, 0)
    dowOccMap.set(d, 0)
  }
  // 期間内の各日の曜日を数える
  eachDayOfInterval({ start: from, end: to }).forEach(d => {
    const dow = d.getDay()
    dowOccMap.set(dow, (dowOccMap.get(dow) || 0) + 1)
  })
  data.forEach(r => {
    const d   = new Date(r.reservation_date)
    const dow = d.getDay()
    dowCountMap.set(dow,   (dowCountMap.get(dow)   || 0) + 1)
    dowRevenueMap.set(dow, (dowRevenueMap.get(dow) || 0) + (r.menu?.price || 0))
  })
  // 月曜始まりで並べる (1,2,3,4,5,6,0)
  const dowOrder = [1, 2, 3, 4, 5, 6, 0]
  const dowBreakdown: DowStat[] = dowOrder.map(day => {
    const count = dowCountMap.get(day) || 0
    const occ   = dowOccMap.get(day) || 1
    return {
      day,
      label:      DOW_LABELS[day],
      count,
      revenue:    dowRevenueMap.get(day) || 0,
      occurrences: occ,
      avgCount:   Math.round((count / occ) * 10) / 10,
    }
  })

  // ── Hourly breakdown ──────────────────────────────────
  const hMap = new Map<string, number>()
  for (let h = 10; h <= 23; h++) hMap.set(String(h).padStart(2, '0'), 0)
  data.forEach(r => {
    if (r.start_time) {
      const hour = String(r.start_time).slice(0, 2)
      if (hMap.has(hour)) hMap.set(hour, (hMap.get(hour) || 0) + 1)
    }
  })
  const hourlyBreakdown: HourlyStat[] = [...hMap.entries()]
    .map(([hour, count]) => ({ hour, count, label: `${parseInt(hour)}時` }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  // ── Age group ─────────────────────────────────────────
  const aMap = new Map<string, number>(AGE_GROUPS.map(g => [g, 0]))
  data.forEach(r => {
    const group = r.age_group as string | null
    if (group && aMap.has(group)) aMap.set(group, (aMap.get(group) || 0) + 1)
  })
  const ageGroupBreakdown: AgeGroupStat[] = AGE_GROUPS.map(group => ({ group, count: aMap.get(group) || 0 }))

  // ── Gender ────────────────────────────────────────────
  const gMap = new Map<string, { count: number; revenue: number }>()
  data.forEach(r => {
    const g = r.gender || 'unknown'
    const e = gMap.get(g) || { count: 0, revenue: 0 }
    gMap.set(g, { count: e.count + 1, revenue: e.revenue + (r.menu?.price || 0) })
  })
  const genderBreakdown = [...gMap.entries()]
    .map(([gender, v]) => ({ gender, label: GENDER_LABELS[gender] || gender, ...v }))
    .sort((a, b) => b.count - a.count)

  // ── Menu ──────────────────────────────────────────────
  const mMap = new Map<string, { count: number; revenue: number }>()
  data.forEach(r => {
    const name = r.menu?.name || '不明'
    const e = mMap.get(name) || { count: 0, revenue: 0 }
    mMap.set(name, { count: e.count + 1, revenue: e.revenue + (r.menu?.price || 0) })
  })
  const menuBreakdown = [...mMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Staff ─────────────────────────────────────────────
  const sMap = new Map<string, { count: number; revenue: number; revenueExTax: number; nextVisitCount: number }>()
  data.forEach(r => {
    const name  = r.staff?.name || '不明'
    const price = r.menu?.price || 0
    const e = sMap.get(name) || { count: 0, revenue: 0, revenueExTax: 0, nextVisitCount: 0 }
    sMap.set(name, {
      count:          e.count + 1,
      revenue:        e.revenue + price,
      revenueExTax:   e.revenueExTax + (r.menu?.price_ex_tax ?? 0),
      nextVisitCount: e.nextVisitCount + (r.next_visit_booked === true ? 1 : 0),
    })
  })
  const staffBreakdown = Array.from(sMap.entries())
    .map(([name, v]) => ({
      name,
      count:           v.count,
      revenue:         v.revenue,
      revenueExTax:    v.revenueExTax,
      avgRevenue:      v.count > 0 ? Math.round(v.revenue / v.count) : 0,
      avgRevenueExTax: v.count > 0 ? Math.round(v.revenueExTax / v.count) : 0,
      nextVisitCount:  v.nextVisitCount,
    }))
    .sort((a, b) => b.count - a.count)

  // ── 断り集計 ──────────────────────────────────────────────────────────
  const refusalMap = new Map<string, number>()
  refusals.forEach(r => {
    refusalMap.set(r.reason, (refusalMap.get(r.reason) || 0) + 1)
  })
  const refusalSummary: RefusalSummary = {
    total: refusals.length,
    breakdown: [...refusalMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  }

  return {
    period: { from: fromStr, to: toStr },
    summary: { totalRevenue, totalRevenueExTax, totalReservations, avgRevenue, repeatRate, nextVisitRate, occupancyRate },
    dailySales,
    genderBreakdown,
    menuBreakdown,
    staffBreakdown,
    hourlyBreakdown,
    newVsRepeat,
    ageGroupBreakdown,
    nextVisitStat,
    dowBreakdown,
    occupancy,
    refusalSummary,
  }
}
