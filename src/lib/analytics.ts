import { SupabaseClient } from '@supabase/supabase-js'
import {
  format,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  startOfYear, endOfYear,
  eachDayOfInterval,
} from 'date-fns'

export type Period = 'today' | 'week' | 'month' | 'year'

export interface DailySale  { date: string; revenue: number; count: number }
export interface GenderStat { gender: string; label: string; count: number; revenue: number }
export interface MenuStat   { name: string; count: number; revenue: number }
export interface StaffStat  { name: string; count: number; revenue: number }

export interface AnalyticsData {
  period: { from: string; to: string }
  summary: { totalRevenue: number; totalReservations: number; avgRevenue: number }
  dailySales: DailySale[]
  genderBreakdown: GenderStat[]
  menuBreakdown: MenuStat[]
  staffBreakdown: StaffStat[]
}

const GENDER_LABELS: Record<string, string> = {
  male: '男性', female: '女性', other: 'その他', unknown: '未設定',
}

export async function computeAnalytics(
  supabase: SupabaseClient,
  period: Period = 'month',
): Promise<AnalyticsData> {
  const today = new Date()
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

  const { data: rows } = await supabase
    .from('reservations')
    .select('reservation_date, gender, menu:menus(name, price), staff:staff(name)')
    .gte('reservation_date', fromStr)
    .lte('reservation_date', toStr)
    .eq('status', 'confirmed')

  const data = (rows || []) as any[]

  // ── Summary ──────────────────────────────────────────
  const totalRevenue      = data.reduce((s, r) => s + (r.menu?.price || 0), 0)
  const totalReservations = data.length
  const avgRevenue        = totalReservations > 0
    ? Math.round(totalRevenue / totalReservations) : 0

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
  const dailySales = [...dailyMap.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

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
  const sMap = new Map<string, { count: number; revenue: number }>()
  data.forEach(r => {
    const name = r.staff?.name || '不明'
    const e = sMap.get(name) || { count: 0, revenue: 0 }
    sMap.set(name, { count: e.count + 1, revenue: e.revenue + (r.menu?.price || 0) })
  })
  const staffBreakdown = [...sMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)

  return {
    period: { from: fromStr, to: toStr },
    summary: { totalRevenue, totalReservations, avgRevenue },
    dailySales,
    genderBreakdown,
    menuBreakdown,
    staffBreakdown,
  }
}
