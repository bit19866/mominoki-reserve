'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import {
  format, parseISO,
  addMonths, subMonths,
  addWeeks,  subWeeks,
  addDays,   subDays,
  addYears,  subYears,
  isSameMonth, isSameWeek, isSameDay, isSameYear,
  startOfWeek,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import type { AnalyticsData, Period } from '@/lib/analytics'

// ─── 天気 ──────────────────────────────────────────────────────────────────────

interface WeatherDay {
  date: string
  code: number
  maxTemp: number
  minTemp: number
  precipitation: number
}

const WMO_ICON: Record<number, string> = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌧️', 55:'🌧️',
  61:'🌦️', 63:'🌧️', 65:'⛈️',
  71:'❄️', 73:'❄️', 75:'❄️',
  80:'🌦️', 81:'🌧️', 82:'⛈️',
  95:'⛈️',
}
function wmoIcon(code: number) {
  return WMO_ICON[code] ?? WMO_ICON[Math.floor(code / 10) * 10] ?? '—'
}

async function fetchWeather(fromDate: string, toDate: string): Promise<WeatherDay[]> {
  try {
    // 過去データは archive API、直近は forecast API（90日以内）
    const diffDays = Math.floor((Date.now() - new Date(fromDate).getTime()) / 86400000)
    const baseUrl = diffDays > 90
      ? 'https://archive-api.open-meteo.com/v1/archive'
      : 'https://api.open-meteo.com/v1/forecast'
    const url = `${baseUrl}?latitude=35.1636&longitude=138.6771` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum` +
      `&timezone=Asia%2FTokyo&start_date=${fromDate}&end_date=${toDate}`
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    if (!json.daily?.time) return []
    return json.daily.time.map((date: string, i: number) => ({
      date,
      code:          json.daily.weathercode[i]         ?? 0,
      maxTemp:       json.daily.temperature_2m_max[i]  ?? 0,
      minTemp:       json.daily.temperature_2m_min[i]  ?? 0,
      precipitation: json.daily.precipitation_sum[i]   ?? 0,
    }))
  } catch { return [] }
}

// ─── CSV エクスポート ───────────────────────────────────────────────────────────

function downloadCSV(data: AnalyticsData, period: Period) {
  const PL: Record<Period, string> = { today:'今日', week:'今週', month:'今月', year:'今年' }
  const lines: string[] = []
  lines.push(`集計期間,${PL[period]},${data.period.from} 〜 ${data.period.to}`)
  lines.push('')
  lines.push('【売上サマリー】')
  lines.push(`売上合計（税込）,${data.summary.totalRevenue}`)
  lines.push(`売上合計（税抜）,${data.summary.totalRevenueExTax}`)
  lines.push(`予約件数,${data.summary.totalReservations}`)
  lines.push(`客単価（税込）,${data.summary.avgRevenue}`)
  lines.push(`リピート率,${data.summary.repeatRate}%`)
  lines.push(`次回予約率,${data.summary.nextVisitRate}%`)
  lines.push(`稼働率,${data.summary.occupancyRate}%`)
  lines.push('')
  lines.push('【曜日別集計】')
  lines.push('曜日,合計件数,平均件数/週,売上（円）')
  data.dowBreakdown.forEach(d => lines.push(`${d.label}曜日,${d.count},${d.avgCount},${d.revenue}`))
  lines.push('')
  lines.push('【新規・リピーター】')
  lines.push(`新規,${data.newVsRepeat.newCount}`)
  lines.push(`リピーター,${data.newVsRepeat.repeatCount}`)
  lines.push(`未記録,${data.newVsRepeat.unknownCount}`)
  lines.push('')
  lines.push('【時間帯別来店】')
  lines.push('時間帯,件数')
  data.hourlyBreakdown.forEach(h => lines.push(`${h.label},${h.count}`))
  lines.push('')
  lines.push('【年代別】')
  lines.push('年代,件数')
  data.ageGroupBreakdown.forEach(a => lines.push(`${a.group},${a.count}`))
  lines.push('')
  lines.push('【次回予約】')
  lines.push(`予約あり,${data.nextVisitStat.booked}`)
  lines.push(`予約なし,${data.nextVisitStat.notBooked}`)
  lines.push(`未記録,${data.nextVisitStat.unknown}`)
  lines.push('')
  lines.push('【日次売上】')
  lines.push('日付,売上（円）,予約件数,稼働率（%）')
  data.dailySales.forEach(d => {
    const occ = data.occupancy.daily.find(o => o.date === d.date)
    lines.push(`${d.date},${d.revenue},${d.count},${occ?.rate ?? ''}`)
  })
  lines.push('')
  lines.push('【男女別集計】')
  lines.push('性別,件数,売上（円）')
  data.genderBreakdown.forEach(g => lines.push(`${g.label},${g.count},${g.revenue}`))
  lines.push('')
  lines.push('【コース別集計】')
  lines.push('コース名,件数,売上（円）')
  data.menuBreakdown.forEach(m => lines.push(`${m.name},${m.count},${m.revenue}`))
  lines.push('')
  lines.push('【スタッフ別集計】')
  lines.push('スタッフ名,施術数,次回予約取得数,売上（税込）,売上（税抜）,客単価（税込）,客単価（税抜）')
  data.staffBreakdown.forEach(s =>
    lines.push(`${s.name},${s.count},${s.nextVisitCount},${s.revenue},${s.revenueExTax},${s.avgRevenue},${s.avgRevenueExTax}`)
  )
  const csv = '﻿' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `売上集計_${data.period.from}_${data.period.to}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ─── 定数 ──────────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = { today:'今日', week:'今週', month:'今月', year:'今年' }
const GENDER_COLORS: Record<string, string> = { female:'#ec4899', male:'#3b82f6', other:'#8b5cf6', unknown:'#9ca3af' }
const AGE_COLORS   = ['#6366f1','#8b5cf6','#ec4899','#f97316','#eab308','#10b981']
const DOW_COLORS   = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899'] // 日〜土

function groupByMonth(dailySales: AnalyticsData['dailySales']) {
  const map = new Map<string, { revenue: number; count: number; refusalCount: number }>()
  dailySales.forEach(d => {
    const key = d.date.slice(0, 7)
    const e = map.get(key) || { revenue: 0, count: 0, refusalCount: 0 }
    map.set(key, { revenue: e.revenue + d.revenue, count: e.count + d.count, refusalCount: e.refusalCount + d.refusalCount })
  })
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }))
}

function formatLabel(str: string, period: Period): string {
  try {
    const d = str.length === 7 ? parseISO(str + '-01') : parseISO(str)
    if (period === 'year')  return format(d, 'M月', { locale: ja })
    return format(d, 'M/d(EEE)', { locale: ja })
  } catch { return str }
}

function getPeriodLabel(period: Period, refDate: Date): string {
  switch (period) {
    case 'today':  return format(refDate, 'yyyy年M月d日(EEE)', { locale: ja })
    case 'week': {
      const mon = startOfWeek(refDate, { weekStartsOn: 1 })
      return format(mon, 'yyyy年M月d日〜', { locale: ja })
    }
    case 'year':  return format(refDate, 'yyyy年', { locale: ja })
    default:      return format(refDate, 'yyyy年M月', { locale: ja })
  }
}

function isCurrentPeriod(period: Period, refDate: Date): boolean {
  const now = new Date()
  switch (period) {
    case 'today':  return isSameDay(refDate, now)
    case 'week':   return isSameWeek(refDate, now, { weekStartsOn: 1 })
    case 'year':   return isSameYear(refDate, now)
    default:       return isSameMonth(refDate, now)
  }
}

// ─── メインコンポーネント ───────────────────────────────────────────────────────

interface NominationStat {
  staffName: string
  personal: number
  gender: number
  total: number
}

export default function AnalyticsDashboard({ initialData }: { initialData: AnalyticsData }) {
  const [mounted,          setMounted]          = useState(false)
  const [period,           setPeriod]           = useState<Period>('month')
  const [refDate,          setRefDate]          = useState<Date>(new Date())
  const [data,             setData]             = useState<AnalyticsData>(initialData)
  const [loading,          setLoading]          = useState(false)
  const [weather,          setWeather]          = useState<WeatherDay[]>([])
  const [nominationStats,  setNominationStats]  = useState<NominationStat[]>([])

  useEffect(() => { setMounted(true) }, [])

  // 天気データ取得（年表示以外）
  useEffect(() => {
    if (period === 'year') { setWeather([]); return }
    fetchWeather(data.period.from, data.period.to).then(setWeather)
  }, [data.period.from, data.period.to, period])

  // 指名別集計
  useEffect(() => {
    fetch(`/api/admin/payments?from=${data.period.from}&to=${data.period.to}`)
      .then(r => r.json())
      .then((payments: Array<{ staff_name?: string; nomination_type?: string }>) => {
        const map = new Map<string, { personal: number; gender: number }>()
        payments.forEach(p => {
          if (!p.nomination_type || !p.staff_name) return
          const entry = map.get(p.staff_name) || { personal: 0, gender: 0 }
          if (p.nomination_type === '個人指名') entry.personal++
          else if (p.nomination_type === '男女指名') entry.gender++
          map.set(p.staff_name, entry)
        })
        setNominationStats(
          Array.from(map.entries())
            .map(([staffName, v]) => ({ staffName, personal: v.personal, gender: v.gender, total: v.personal + v.gender }))
            .sort((a, b) => b.total - a.total)
        )
      })
      .catch(() => {})
  }, [data.period.from, data.period.to])

  const fetchData = useCallback(async (p: Period, d: Date) => {
    setLoading(true)
    const dateStr = format(d, 'yyyy-MM-dd')
    const res  = await fetch(`/api/admin/analytics?period=${p}&date=${dateStr}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [])

  const handlePeriodChange = (p: Period) => {
    const newRef = new Date()
    setPeriod(p); setRefDate(newRef); fetchData(p, newRef)
  }

  const navigate = (dir: 'prev' | 'next') => {
    if (dir === 'next' && isCurrentPeriod(period, refDate)) return
    const fn = dir === 'prev'
      ? { today: subDays, week: subWeeks, month: subMonths, year: subYears }
      : { today: addDays, week: addWeeks, month: addMonths, year: addYears }
    const newRef = fn[period](refDate, 1)
    setRefDate(newRef); fetchData(period, newRef)
  }

  const isCurrent  = isCurrentPeriod(period, refDate)
  const chartData  = period === 'year' ? groupByMonth(data.dailySales) : data.dailySales
  const peakHour   = data.hourlyBreakdown.reduce((a, b) => b.count > a.count ? b : a, data.hourlyBreakdown[0])
  const peakDow    = [...data.dowBreakdown].sort((a, b) => b.count - a.count)[0]

  // 天気マップ（date → WeatherDay）
  const weatherMap = new Map(weather.map(w => [w.date, w]))

  const chartDataWithWeather = chartData

  return (
    <div className="space-y-5">

      {/* 期間セレクター */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button key={p} onClick={() => handlePeriodChange(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* 前後ナビ */}
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('prev')}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-lg"
          >‹</button>
          <div className="px-3 py-1.5 min-w-[140px] text-center">
            <span className={`text-sm font-semibold ${isCurrent ? 'text-gray-900' : 'text-blue-600'}`}>
              {getPeriodLabel(period, refDate)}
            </span>
            {!isCurrent && (
              <p className="text-[10px] text-gray-400 mt-0.5">{data.period.from} 〜 {data.period.to}</p>
            )}
          </div>
          <button onClick={() => navigate('next')} disabled={isCurrent}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border text-lg font-bold transition-colors ${
              isCurrent ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >›</button>
          {!isCurrent && (
            <button onClick={() => { const now = new Date(); setRefDate(now); fetchData(period, now) }}
              className="ml-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
            >今に戻る</button>
          )}
        </div>

        <button onClick={() => downloadCSV(data, period)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >↓ CSVダウンロード</button>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="flex justify-center mb-2 animate-pulse">
            <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
          </div>
          <p className="text-sm">データを読み込み中...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ── KPIカード (8枚) ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <KpiCard label="売上合計（税込）"  value={`¥${data.summary.totalRevenue.toLocaleString()}`}      color="pink"   icon="yen" />
            <KpiCard label="売上合計（税抜）"  value={`¥${data.summary.totalRevenueExTax.toLocaleString()}`} color="orange" icon="receipt" />
            <KpiCard label="予約件数"          value={`${data.summary.totalReservations}件`}                 color="blue"   icon="calendar" />
            <KpiCard label="客単価（税込）"    value={`¥${data.summary.avgRevenue.toLocaleString()}`}        color="purple" icon="person" />
            <KpiCard label="稼働率"            value={`${data.summary.occupancyRate}%`}                      color="indigo" icon="bed"
              note={data.summary.occupancyRate >= 70 ? '高稼働' : data.summary.occupancyRate >= 40 ? '普通' : '空き多め'} />
            <KpiCard label="新規・リピーター"
              value={`新規${data.newVsRepeat.newCount}名`}
              color="green" icon="repeat"
              note={`リピート${data.newVsRepeat.repeatCount}名 / 計${data.newVsRepeat.newCount + data.newVsRepeat.repeatCount}名`} />
            <KpiCard label="次回予約率"        value={`${data.summary.nextVisitRate}%`}                       color="teal"   icon="next"
              note={`取得${data.nextVisitStat.booked}件`} />
            <KpiCard label="断り件数"          value={`${data.refusalSummary.total}件`}                      color="red"    icon="ban"
              note={data.refusalSummary.breakdown[0] ? `最多: ${data.refusalSummary.breakdown[0].reason}` : undefined} />
          </div>

          {/* ── 売上推移 + 天気 ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{period === 'year' ? '月次' : '日次'}売上・予約数・断り数</h3>
              {weather.length > 0 && <span className="text-xs text-sky-500 font-medium">🌡️ 富士市の天気連動</span>}
            </div>

            {mounted ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartDataWithWeather} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={s => formatLabel(s, period)} tick={{ fontSize: 10, fill: '#6b7280' }} interval="preserveStartEnd" />
                  <YAxis yAxisId="revenue" orientation="left"  tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : String(v)} tick={{ fontSize: 10, fill: '#ec4899' }} width={38} />
                  <YAxis yAxisId="count"   orientation="right" tick={{ fontSize: 10, fill: '#3b82f6' }} width={24} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const w = weatherMap.get(label as string)
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                          <p className="font-semibold text-gray-700 mb-1">{formatLabel(label as string, period)}</p>
                          {w && (
                            <p className="text-sky-600 mb-1">{wmoIcon(w.code)} {w.maxTemp}°/{w.minTemp}°
                              {w.precipitation > 0 && ` 🌧️${w.precipitation}mm`}
                            </p>
                          )}
                          {payload.map((p: any) => (
                            <p key={p.dataKey} style={{ color: p.color }}>
                              {p.dataKey === 'revenue'      ? `売上: ¥${(p.value as number).toLocaleString()}`
                               : p.dataKey === 'count'       ? `予約数: ${p.value}件`
                               : p.dataKey === 'refusalCount' ? `断り: ${p.value}件`
                               : ''}
                            </p>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Bar yAxisId="revenue" dataKey="revenue"      fill="#fce7f3" stroke="#f9a8d4" strokeWidth={1} radius={[3,3,0,0]} />
                  <Bar yAxisId="count"   dataKey="count"        fill="#dbeafe" stroke="#93c5fd" strokeWidth={1} radius={[3,3,0,0]} />
                  <Bar yAxisId="count"   dataKey="refusalCount" fill="#fee2e2" stroke="#fca5a5" strokeWidth={1} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] bg-gray-50 rounded-lg animate-pulse" />}

            {/* 天気ストリップ（月・週・今日のみ） */}
            {weather.length > 0 && period !== 'year' && mounted && (
              <WeatherStrip weather={weather} dailySales={data.dailySales} period={period} />
            )}

            <div className="flex gap-4 mt-2 justify-center text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 inline-block rounded-sm bg-pink-100 border border-pink-300" />売上</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 inline-block rounded-sm bg-blue-100 border border-blue-300" />予約数</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 inline-block rounded-sm bg-red-100 border border-red-300" />断り数</span>
            </div>
          </div>


          {/* ── 曜日別グラフ ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">曜日別来店パターン</h3>
              {peakDow && (
                <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-1 rounded-full">
                  最多 {peakDow.label}曜日（計 {peakDow.count}件）
                </span>
              )}
            </div>
            {mounted ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.dowBreakdown} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="label" tickFormatter={l => `${l}曜`} tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip
                    formatter={(v: number, name: string) =>
                      name === 'count' ? [`${v}件`, '合計件数'] : [`¥${(v as number).toLocaleString()}`, '合計売上']
                    }
                    labelFormatter={(l: string) => `${l}曜日`}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = data.dowBreakdown.find(x => x.label === label)
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow p-3 text-xs">
                          <p className="font-semibold text-gray-700 mb-1">{label}曜日</p>
                          <p className="text-gray-600">合計: {d?.count}件</p>
                          <p className="text-amber-600 font-bold">平均: {d?.avgCount}件/回</p>
                          <p className="text-pink-600">売上: ¥{d?.revenue.toLocaleString()}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {data.dowBreakdown.map((entry, i) => (
                      <Cell key={i}
                        fill={entry.day === peakDow?.day ? '#f59e0b' : DOW_COLORS[entry.day]}
                        opacity={entry.day === peakDow?.day ? 1 : 0.75}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[180px] bg-gray-50 rounded-lg animate-pulse" />}
            {/* 曜日ヒント */}
            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
              {data.dowBreakdown.map(d => (
                <div key={d.day} className="text-[10px]">
                  <div className="w-5 h-5 rounded-full mx-auto mb-0.5 flex items-center justify-center text-white font-bold text-[10px]"
                    style={{ backgroundColor: d.day === peakDow?.day ? '#f59e0b' : DOW_COLORS[d.day] }}>
                    {d.label}
                  </div>
                  <p className="font-bold text-gray-700">{d.count}</p>
                  <p className="text-gray-400">件</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── 新規/リピーター + 時間帯 ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">新規 / リピーター</h3>
              {data.newVsRepeat.newCount + data.newVsRepeat.repeatCount === 0 ? (
                <EmptyNote text="会計時・手動入力時に「新規/リピーター」を選択すると表示されます" />
              ) : (
                <div className="flex items-center gap-6">
                  {mounted && (
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie data={[
                          { name:'新規',      value: data.newVsRepeat.newCount    },
                          { name:'リピーター', value: data.newVsRepeat.repeatCount },
                        ].filter(d => d.value > 0)}
                          dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={65} strokeWidth={2}
                        >
                          <Cell fill="#3b82f6" /><Cell fill="#10b981" />
                        </Pie>
                        <Tooltip formatter={(v: number, name: string) => [`${v}件`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="space-y-3 flex-1">
                    {[
                      { label:'新規',       count: data.newVsRepeat.newCount,    color:'#3b82f6' },
                      { label:'リピーター', count: data.newVsRepeat.repeatCount, color:'#10b981' },
                    ].map(item => {
                      const total = data.newVsRepeat.newCount + data.newVsRepeat.repeatCount
                      const pct   = total > 0 ? Math.round((item.count / total) * 100) : 0
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="flex items-center gap-1.5 font-medium text-gray-700">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              {item.label}
                            </span>
                            <span className="text-gray-500">{item.count}名 ({pct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${pct}%`, backgroundColor: item.color }} />
                          </div>
                        </div>
                      )
                    })}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400">合計</p>
                      <p className="text-2xl font-bold text-gray-800">{data.newVsRepeat.newCount + data.newVsRepeat.repeatCount}名</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">来店時間の偏り</h3>
                {peakHour && peakHour.count > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-1 rounded-full">
                    ピーク {peakHour.label}（{peakHour.count}件）
                  </span>
                )}
              </div>
              {data.hourlyBreakdown.every(h => h.count === 0) ? (
                <EmptyNote text="予約データがありません" />
              ) : mounted ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data.hourlyBreakdown} margin={{ top:0, right:4, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize:10, fill:'#9ca3af' }} interval={1} />
                    <YAxis tick={{ fontSize:10, fill:'#9ca3af' }} />
                    <Tooltip formatter={(v: number) => [`${v}件`, '来店数']} />
                    <Bar dataKey="count" radius={[3,3,0,0]}>
                      {data.hourlyBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.hour === peakHour?.hour ? '#f59e0b' : '#93c5fd'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[160px] bg-gray-50 rounded-lg animate-pulse" />}
            </div>
          </div>

          {/* ── 年代 + 男女比 ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">年代別来店</h3>
              {data.ageGroupBreakdown.every(a => a.count === 0) ? (
                <EmptyNote text="会計時・手動入力時に「年代」を選択すると表示されます" />
              ) : mounted ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.ageGroupBreakdown} layout="vertical" margin={{ top:0, right:40, left:40, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize:10, fill:'#9ca3af' }} />
                    <YAxis dataKey="group" type="category" tick={{ fontSize:11, fill:'#6b7280' }} width={50} />
                    <Tooltip formatter={(v: number) => [`${v}件`, '件数']} />
                    <Bar dataKey="count" radius={[0,3,3,0]}>
                      {data.ageGroupBreakdown.map((_, i) => <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[180px] bg-gray-50 rounded-lg animate-pulse" />}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">男女比</h3>
              {data.genderBreakdown.length === 0 ? <EmptyNote text="予約データがありません" /> : (
                <>
                  {mounted ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={data.genderBreakdown} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={42} outerRadius={70} strokeWidth={2}>
                          {data.genderBreakdown.map(e => <Cell key={e.gender} fill={GENDER_COLORS[e.gender] || '#9ca3af'} />)}
                        </Pie>
                        <Tooltip formatter={(v: number, name: string) => [`${v}件`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[160px] bg-gray-50 rounded-lg animate-pulse" />}
                  <div className="mt-3 space-y-2">
                    {data.genderBreakdown.map(g => {
                      const total = data.genderBreakdown.reduce((s,x) => s + x.count, 0)
                      const pct   = total > 0 ? Math.round((g.count / total) * 100) : 0
                      return (
                        <div key={g.gender} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: GENDER_COLORS[g.gender] || '#9ca3af' }} />
                            <span className="text-gray-700">{g.label}</span>
                          </div>
                          <span className="font-medium text-gray-600">{g.count}件 ({pct}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── 次回予約分析 ───────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">次回予約取得分析</h3>
            {data.nextVisitStat.booked + data.nextVisitStat.notBooked === 0 ? (
              <EmptyNote text="会計時に「次回予約あり/なし」を選択すると表示されます" />
            ) : (
              <div className="flex flex-wrap gap-6 items-center">
                <div className="text-center min-w-[100px]">
                  <p className="text-5xl font-black text-teal-600">{data.nextVisitStat.rate}%</p>
                  <p className="text-xs text-gray-400 mt-1">次回予約取得率</p>
                </div>
                <div className="flex-1 space-y-2 min-w-[200px]">
                  {[
                    { label:'予約あり', count: data.nextVisitStat.booked,   color:'#0d9488' },
                    { label:'予約なし', count: data.nextVisitStat.notBooked, color:'#e5e7eb' },
                    { label:'未記録',   count: data.nextVisitStat.unknown,   color:'#f3f4f6' },
                  ].map(item => {
                    const total = data.nextVisitStat.booked + data.nextVisitStat.notBooked + data.nextVisitStat.unknown
                    const pct   = total > 0 ? Math.round((item.count / total) * 100) : 0
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5 font-medium text-gray-700">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color, border: item.color === '#f3f4f6' ? '1px solid #e5e7eb' : 'none' }} />
                            {item.label}
                          </span>
                          <span className="text-gray-500">{item.count}件</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width:`${pct}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="bg-teal-50 rounded-xl p-4 text-sm text-teal-700 min-w-[180px]">
                  <p className="font-semibold mb-1">改善ポイント</p>
                  <p className="text-xs leading-relaxed">
                    {data.nextVisitStat.rate >= 70 ? '素晴らしい！次回予約取得率が高い水準です。'
                     : data.nextVisitStat.rate >= 40 ? '会計時に次回の提案を積極的に行いましょう。'
                     : '次回予約の声がけを習慣化しましょう。'}
                  </p>
                </div>
              </div>
            )}
            {/* スタッフ別 次回予約獲得数 */}
            {data.staffBreakdown.some(s => s.nextVisitCount > 0) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-3">スタッフ別 次回予約獲得数</p>
                <div className="space-y-2">
                  {[...data.staffBreakdown]
                    .sort((a, b) => b.nextVisitCount - a.nextVisitCount)
                    .map(s => {
                      const pct = s.count > 0 ? Math.round((s.nextVisitCount / s.count) * 100) : 0
                      return (
                        <div key={s.name}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700">{s.name}</span>
                            <span className="text-gray-500">
                              <span className="font-bold text-teal-700">{s.nextVisitCount}件取得</span>
                              <span className="ml-1 text-gray-400">/ 施術{s.count}件 ({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>

          {/* ── コース別ランキング ────────────────────────────────────────────── */}
          <RankingCard title="コース別人気ランキング" data={data.menuBreakdown} barColor="#c9a97a" />

          {/* ── 断り集計 ──────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">断り集計</h3>
              <span className="text-sm font-bold text-orange-600">合計 {data.refusalSummary.total}件</span>
            </div>
            {data.refusalSummary.total === 0 ? (
              <p className="text-sm text-center py-6 text-gray-400">この期間の断りデータはありません</p>
            ) : (
              <div className="space-y-3">
                {data.refusalSummary.breakdown.map(item => {
                  const pct = data.refusalSummary.total > 0
                    ? Math.round((item.count / data.refusalSummary.total) * 100) : 0
                  return (
                    <div key={item.reason}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{item.reason}</span>
                        <span className="text-gray-500">{item.count}件　<span className="text-orange-600 font-bold">{pct}%</span></span>
                      </div>
                      <div className="h-2.5 rounded-full bg-orange-50 border border-orange-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-orange-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── スタッフ別集計 ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">スタッフ別集計</h3>
            {data.staffBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['スタッフ','施術数','売上（税込）','売上（税抜）','客単価（税込）','客単価（税抜）'].map(h => (
                        <th key={h} className={`py-2 ${h==='スタッフ'?'text-left pr-4':'text-right px-3'} font-semibold text-xs text-gray-400 whitespace-nowrap`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.staffBreakdown.map((s, i) => (
                      <tr key={s.name} className={i%2===1?'bg-gray-50':''}>
                        <td className="py-2.5 pr-4 font-medium text-gray-800 whitespace-nowrap"><span className="text-xs text-gray-400 mr-1.5">{i+1}.</span>{s.name}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-green-700">{s.count}件</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">¥{s.revenue.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">¥{s.revenueExTax.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">¥{s.avgRevenue.toLocaleString()}</td>
                        <td className="py-2.5 pl-3 text-right text-gray-700">¥{s.avgRevenueExTax.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="py-2.5 pr-4 font-bold text-gray-800">合計</td>
                      <td className="py-2.5 px-3 text-right font-bold text-green-700">{data.staffBreakdown.reduce((s,x)=>s+x.count,0)}件</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-800">¥{data.staffBreakdown.reduce((s,x)=>s+x.revenue,0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-800">¥{data.staffBreakdown.reduce((s,x)=>s+x.revenueExTax,0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-gray-400 text-xs">—</td>
                      <td className="py-2.5 pl-3 text-right text-gray-400 text-xs">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : <p className="text-sm text-center py-8 text-gray-400">予約データなし</p>}
          </div>

          {/* ── 指名別集計 ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">指名別集計</h3>
            {nominationStats.length === 0 ? (
              <p className="text-sm text-center py-6 text-gray-400">この期間の指名データはありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['スタッフ','個人指名','男女指名','合計'].map(h => (
                        <th key={h} className={`py-2 ${h==='スタッフ'?'text-left pr-4':'text-right px-3'} font-semibold text-xs text-gray-400 whitespace-nowrap`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {nominationStats.map((s, i) => (
                      <tr key={s.staffName} className={i%2===1?'bg-gray-50':''}>
                        <td className="py-2.5 pr-4 font-medium text-gray-800 whitespace-nowrap"><span className="text-xs text-gray-400 mr-1.5">{i+1}.</span>{s.staffName}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-pink-700">{s.personal}件</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-700">{s.gender}件</td>
                        <td className="py-2.5 pl-3 text-right font-bold text-gray-800">{s.total}件</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="py-2.5 pr-4 font-bold text-gray-800">合計</td>
                      <td className="py-2.5 px-3 text-right font-bold text-pink-700">{nominationStats.reduce((s,x)=>s+x.personal,0)}件</td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-700">{nominationStats.reduce((s,x)=>s+x.gender,0)}件</td>
                      <td className="py-2.5 pl-3 text-right font-bold text-gray-800">{nominationStats.reduce((s,x)=>s+x.total,0)}件</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── 天気ストリップ ─────────────────────────────────────────────────────────────

function WeatherStrip({ weather, dailySales, period }: {
  weather: WeatherDay[]
  dailySales: AnalyticsData['dailySales']
  period: Period
}) {
  const dates = dailySales.map(d => d.date)
  const show  = weather.filter(w => dates.includes(w.date))
  if (show.length === 0) return null

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="text-[10px] text-sky-500 font-medium mb-2">🌡️ 天気・気温</p>
      <div className="flex gap-0 overflow-x-auto">
        {show.map(w => (
          <div key={w.date} className="flex-1 min-w-[28px] text-center">
            <p className="text-base leading-none">{wmoIcon(w.code)}</p>
            <p className="text-[9px] text-red-500 font-bold mt-0.5">{Math.round(w.maxTemp)}°</p>
            <p className="text-[9px] text-blue-400">{Math.round(w.minTemp)}°</p>
            {w.precipitation > 0 && (
              <p className="text-[8px] text-sky-400">{w.precipitation.toFixed(0)}mm</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── サブコンポーネント ─────────────────────────────────────────────────────────

type KpiColor = 'pink' | 'blue' | 'purple' | 'orange' | 'green' | 'teal' | 'indigo' | 'red'
type KpiIcon  = 'yen' | 'receipt' | 'calendar' | 'person' | 'repeat' | 'next' | 'bed' | 'ban'

const KPI_STYLES: Record<KpiColor, { bg:string; border:string; text:string; sub:string }> = {
  pink:   { bg:'#fdf2f8', border:'#f9a8d4', text:'#9d174d', sub:'#db2777' },
  blue:   { bg:'#eff6ff', border:'#bfdbfe', text:'#1e40af', sub:'#3b82f6' },
  purple: { bg:'#f5f3ff', border:'#ddd6fe', text:'#5b21b6', sub:'#8b5cf6' },
  orange: { bg:'#fff7ed', border:'#fed7aa', text:'#9a3412', sub:'#f97316' },
  green:  { bg:'#f0fdf4', border:'#bbf7d0', text:'#14532d', sub:'#16a34a' },
  teal:   { bg:'#f0fdfa', border:'#99f6e4', text:'#134e4a', sub:'#0d9488' },
  indigo: { bg:'#eef2ff', border:'#c7d2fe', text:'#312e81', sub:'#6366f1' },
  red:    { bg:'#fff7ed', border:'#fed7aa', text:'#c2410c', sub:'#ea580c' },
}

const KPI_ICONS: Record<KpiIcon, React.ReactNode> = {
  yen:     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  receipt: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  calendar:<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  person:  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  repeat:  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  next:    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><path d="M6 12h12"/><circle cx="12" cy="12" r="10"/></svg>,
  bed:     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>,
  ban:     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
}

function KpiCard({ label, value, color, icon, note }: {
  label:string; value:string; color:KpiColor; icon:KpiIcon; note?:string
}) {
  const s = KPI_STYLES[color]
  return (
    <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor:s.bg, border:`1px solid ${s.border}` }}>
      <div className="mb-2" style={{ color:s.sub }}>{KPI_ICONS[icon]}</div>
      <p className="text-xs font-medium mb-1 leading-tight" style={{ color:s.sub }}>{label}</p>
      <p className="text-xl font-bold leading-tight" style={{ color:s.text }}>{value}</p>
      {note && <p className="text-[10px] mt-1" style={{ color:s.sub, opacity:0.8 }}>{note}</p>}
    </div>
  )
}

function EmptyNote({ text }: { text:string }) {
  return (
    <div className="flex items-center justify-center py-8 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
      <p className="text-xs text-center text-gray-400 leading-relaxed">{text}</p>
    </div>
  )
}

function RankingCard({ title, data, barColor }: {
  title:string; data:Array<{ name:string; count:number; revenue:number }>; barColor:string
}) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-800 mb-4">{title}</h3>
      {data.length > 0 ? (
        <div className="space-y-3">
          {data.map((item, i) => (
            <div key={item.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 truncate">
                  <span className="mr-1.5 text-gray-400">{i+1}.</span>{item.name}
                </span>
                <span className="shrink-0 ml-2 text-gray-500">{item.count}件 · ¥{item.revenue.toLocaleString()}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width:`${Math.round((item.count/max)*100)}%`, backgroundColor:barColor, opacity:Math.max(1-i*0.07,0.3) }} />
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-center py-8 text-gray-400">予約データなし</p>}
    </div>
  )
}
