'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { AnalyticsData, Period } from '@/lib/analytics'

// ─── CSV エクスポート ──────────────────────────────────────────────────────────

function downloadCSV(data: AnalyticsData, period: Period) {
  const PERIOD_LABELS: Record<Period, string> = {
    today: '今日', week: '今週', month: '今月', year: '今年',
  }
  const lines: string[] = []

  lines.push(`集計期間,${PERIOD_LABELS[period]},${data.period.from} 〜 ${data.period.to}`)
  lines.push('')

  lines.push('【売上サマリー】')
  lines.push(`売上合計,${data.summary.totalRevenue}`)
  lines.push(`予約件数,${data.summary.totalReservations}`)
  lines.push(`客単価,${data.summary.avgRevenue}`)
  lines.push('')

  lines.push('【日次売上】')
  lines.push('日付,売上（円）,予約件数')
  data.dailySales.forEach(d => lines.push(`${d.date},${d.revenue},${d.count}`))
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
  lines.push('スタッフ名,件数,売上（円）')
  data.staffBreakdown.forEach(s => lines.push(`${s.name},${s.count},${s.revenue}`))

  // BOM付きUTF-8（Googleスプレッドシートで文字化けしない）
  const csv  = '﻿' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `売上集計_${data.period.from}_${data.period.to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── 定数 ─────────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  today: '今日',
  week:  '今週',
  month: '今月',
  year:  '今年',
}

const GENDER_COLORS: Record<string, string> = {
  female:  '#ec4899',
  male:    '#3b82f6',
  other:   '#8b5cf6',
  unknown: '#9ca3af',
}

// ─── ユーティリティ ─────────────────────────────────────────────────────────────

/** 年表示の場合は月次集計に変換 */
function groupByMonth(dailySales: AnalyticsData['dailySales']) {
  const map = new Map<string, { revenue: number; count: number }>()
  dailySales.forEach(d => {
    const key = d.date.slice(0, 7)
    const e = map.get(key) || { revenue: 0, count: 0 }
    map.set(key, { revenue: e.revenue + d.revenue, count: e.count + d.count })
  })
  return [...map.entries()].map(([date, v]) => ({ date, ...v }))
}

function formatLabel(str: string, period: Period): string {
  try {
    const d = str.length === 7 ? parseISO(str + '-01') : parseISO(str)
    if (period === 'year') return format(d, 'M月', { locale: ja })
    if (period === 'month') return format(d, 'M/d', { locale: ja })
    return format(d, 'M/d(EEE)', { locale: ja })
  } catch {
    return str
  }
}

// ─── メインコンポーネント ────────────────────────────────────────────────────────

export default function AnalyticsDashboard({ initialData }: { initialData: AnalyticsData }) {
  const [mounted,  setMounted]  = useState(false)
  const [period,   setPeriod]   = useState<Period>('month')
  const [data,     setData]     = useState<AnalyticsData>(initialData)
  const [loading,  setLoading]  = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true)
    const res  = await fetch(`/api/admin/analytics?period=${p}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [])

  const handlePeriodChange = (p: Period) => {
    if (p === period) return
    setPeriod(p)
    fetchData(p)
  }

  const chartData = period === 'year'
    ? groupByMonth(data.dailySales)
    : data.dailySales

  return (
    <div className="space-y-5">

      {/* ── 期間セレクター ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-pink-600 text-white shadow'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-1">
          {data.period.from} 〜 {data.period.to}
        </span>

        {/* CSV ダウンロード */}
        <button
          onClick={() => downloadCSV(data, period)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow transition-colors"
        >
          📥 CSVダウンロード
        </button>
      </div>

      {/* ── ローディング ───────────────────────────────────────────────────── */}
      {loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-2 animate-pulse">📊</div>
          <p className="text-sm">データを読み込み中...</p>
        </div>
      )}

      {/* ── メインコンテンツ ─────────────────────────────────────────────── */}
      {!loading && (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard label="売上合計" value={`¥${data.summary.totalRevenue.toLocaleString()}`}      icon="💰" color="pink"   />
            <SummaryCard label="予約件数" value={`${data.summary.totalReservations}件`}                icon="📋" color="blue"   />
            <SummaryCard label="客単価"   value={`¥${data.summary.avgRevenue.toLocaleString()}`}        icon="👤" color="purple" />
          </div>

          {/* 売上グラフ ＋ 男女比 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* 日次/月次売上グラフ */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">
                {period === 'year' ? '月次' : '日次'}売上・予約数
              </h3>
              {mounted ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={s => formatLabel(s, period)}
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="revenue"
                      orientation="left"
                      tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                      tick={{ fontSize: 10, fill: '#ec4899' }}
                      width={38}
                    />
                    <YAxis
                      yAxisId="count"
                      orientation="right"
                      tick={{ fontSize: 10, fill: '#3b82f6' }}
                      width={24}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'revenue'
                          ? [`¥${value.toLocaleString()}`, '売上']
                          : [`${value}件`, '予約数']
                      }
                      labelFormatter={s => formatLabel(s as string, period)}
                    />
                    <Bar yAxisId="revenue" dataKey="revenue" name="revenue" fill="#fce7f3" stroke="#ec4899" strokeWidth={1} radius={[3,3,0,0]} />
                    <Bar yAxisId="count"   dataKey="count"   name="count"   fill="#dbeafe" stroke="#3b82f6" strokeWidth={1} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] bg-gray-50 rounded-lg animate-pulse" />
              )}
              <div className="flex gap-4 mt-2 justify-center text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-2.5 inline-block rounded-sm bg-pink-200 border border-pink-400" />売上
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-2.5 inline-block rounded-sm bg-blue-200 border border-blue-400" />件数
                </span>
              </div>
            </div>

            {/* 男女比 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3">男女比</h3>
              {data.genderBreakdown.length > 0 ? (
                <>
                  {mounted ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={data.genderBreakdown}
                          dataKey="count"
                          nameKey="label"
                          cx="50%" cy="50%"
                          innerRadius={42}
                          outerRadius={70}
                          strokeWidth={2}
                        >
                          {data.genderBreakdown.map(entry => (
                            <Cell key={entry.gender} fill={GENDER_COLORS[entry.gender] || '#9ca3af'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number, name: string) => [`${v}件`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[160px] bg-gray-50 rounded-lg animate-pulse" />
                  )}
                  <div className="mt-3 space-y-2">
                    {data.genderBreakdown.map(g => {
                      const total = data.genderBreakdown.reduce((s, x) => s + x.count, 0)
                      const pct   = total > 0 ? Math.round((g.count / total) * 100) : 0
                      return (
                        <div key={g.gender} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: GENDER_COLORS[g.gender] || '#9ca3af' }}
                            />
                            <span className="text-gray-700">{g.label}</span>
                          </div>
                          <span className="font-medium text-gray-600">
                            {g.count}件 ({pct}%)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                  データなし
                </div>
              )}
            </div>
          </div>

          {/* コースランキング ＋ スタッフ別 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RankingCard
              title="コース別人気ランキング"
              data={data.menuBreakdown}
              barColor="#ec4899"
            />
            <RankingCard
              title="スタッフ別予約数"
              data={data.staffBreakdown}
              barColor="#3b82f6"
            />
          </div>

        </>
      )}
    </div>
  )
}

// ─── サブコンポーネント ──────────────────────────────────────────────────────────

function SummaryCard({
  label, value, icon, color,
}: {
  label: string; value: string; icon: string; color: 'pink' | 'blue' | 'purple'
}) {
  const styles = {
    pink:   'from-pink-50   to-rose-50   border-pink-100   text-pink-700',
    blue:   'from-blue-50   to-sky-50    border-blue-100   text-blue-700',
    purple: 'from-purple-50 to-violet-50 border-purple-100 text-purple-700',
  }
  return (
    <div className={`bg-gradient-to-br ${styles[color]} border rounded-xl p-5 shadow-sm`}>
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-xs font-medium opacity-60 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

function RankingCard({
  title, data, barColor,
}: {
  title: string
  data: Array<{ name: string; count: number; revenue: number }>
  barColor: string
}) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-bold text-gray-800 mb-4">{title}</h3>
      {data.length > 0 ? (
        <div className="space-y-3">
          {data.map((item, i) => (
            <div key={item.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 truncate">
                  <span className="text-gray-400 mr-1.5 font-normal">{i + 1}.</span>
                  {item.name}
                </span>
                <span className="text-gray-500 shrink-0 ml-2">
                  {item.count}件 · ¥{item.revenue.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((item.count / max) * 100)}%`,
                    backgroundColor: barColor,
                    opacity: Math.max(1 - i * 0.07, 0.3),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">予約データなし</p>
      )}
    </div>
  )
}
