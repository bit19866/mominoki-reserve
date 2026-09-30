'use client'

import { useState, useCallback } from 'react'

type Period = 'today' | 'week' | 'month' | 'year'

interface StaffCompensation {
  staffId: string
  name: string
  commissionRate: number
  count: number
  revenue: number
  revenueExTax: number
  compensation: number
}

interface CompensationData {
  period: { from: string; to: string }
  staff: StaffCompensation[]
}

const PERIOD_LABELS: Record<Period, string> = {
  today: '今日', week: '今週', month: '今月', year: '今年',
}

function downloadCSV(data: CompensationData, period: Period) {
  const lines: string[] = []
  lines.push(`集計期間,${PERIOD_LABELS[period]},${data.period.from} 〜 ${data.period.to}`)
  lines.push('')
  lines.push('スタッフ名,指名数,売上（税込）,売上（税抜）,報酬率,報酬額')
  data.staff.forEach(s =>
    lines.push(`${s.name},${s.count},${s.revenue},${s.revenueExTax},${Math.round(s.commissionRate * 100)}%,${s.compensation}`)
  )
  const total = data.staff.reduce((acc, s) => ({
    count: acc.count + s.count,
    revenue: acc.revenue + s.revenue,
    revenueExTax: acc.revenueExTax + s.revenueExTax,
    compensation: acc.compensation + s.compensation,
  }), { count: 0, revenue: 0, revenueExTax: 0, compensation: 0 })
  lines.push(`合計,${total.count},${total.revenue},${total.revenueExTax},,${total.compensation}`)

  const csv  = '﻿' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `報酬集計_${data.period.from}_${data.period.to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function CompensationDashboard({ initialData }: { initialData: CompensationData }) {
  const [period,  setPeriod]  = useState<Period>('month')
  const [data,    setData]    = useState<CompensationData>(initialData)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState<string | null>(null)
  const [rates,   setRates]   = useState<Record<string, string>>(
    Object.fromEntries(initialData.staff.map(s => [s.staffId, String(Math.round(s.commissionRate * 100))]))
  )

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true)
    const res  = await fetch(`/api/admin/compensation?period=${p}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [])

  const handlePeriodChange = (p: Period) => {
    if (p === period) return
    setPeriod(p)
    fetchData(p)
  }

  const handleRateSave = async (staffId: string) => {
    const pct  = parseFloat(rates[staffId])
    if (isNaN(pct) || pct < 0 || pct > 100) return
    setSaving(staffId)
    await fetch('/api/admin/commission-rates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId, rate: pct / 100 }),
    })
    await fetchData(period)
    setSaving(null)
  }

  const totals = data.staff.reduce(
    (acc, s) => ({
      count:        acc.count + s.count,
      revenue:      acc.revenue + s.revenue,
      revenueExTax: acc.revenueExTax + s.revenueExTax,
      compensation: acc.compensation + s.compensation,
    }),
    { count: 0, revenue: 0, revenueExTax: 0, compensation: 0 }
  )

  return (
    <div className="space-y-5">

      {/* 期間セレクター */}
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
        <button
          onClick={() => downloadCSV(data, period)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow transition-colors"
        >
          📥 CSVダウンロード
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-blue-600 opacity-70 mb-1">総指名数</p>
          <p className="text-2xl font-bold text-blue-700">{totals.count}件</p>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-pink-600 opacity-70 mb-1">売上合計（税込）</p>
          <p className="text-2xl font-bold text-pink-700">¥{totals.revenue.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-orange-600 opacity-70 mb-1">売上合計（税抜）</p>
          <p className="text-2xl font-bold text-orange-700">¥{totals.revenueExTax.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-green-600 opacity-70 mb-1">報酬合計</p>
          <p className="text-2xl font-bold text-green-700">¥{totals.compensation.toLocaleString()}</p>
        </div>
      </div>

      {/* スタッフ別報酬テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">スタッフ別報酬一覧</h3>
          <p className="text-xs text-gray-400 mt-0.5">報酬率は税抜売上に対して計算されます</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="flex justify-center mb-2 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <p className="text-sm">読み込み中...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 whitespace-nowrap">スタッフ</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">指名数</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">売上（税込）</th>
                  <th className="text-right px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">売上（税抜）</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">報酬率</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 whitespace-nowrap">報酬額</th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map((s, i) => (
                  <tr key={s.staffId} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">
                      <span className="text-gray-400 text-xs mr-1.5">{i + 1}.</span>
                      {s.name}
                    </td>
                    <td className="px-3 py-3 text-right text-blue-700 font-semibold">{s.count}件</td>
                    <td className="px-3 py-3 text-right text-gray-700">¥{s.revenue.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-gray-700">¥{s.revenueExTax.toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={rates[s.staffId] ?? ''}
                          onChange={e => setRates(r => ({ ...r, [s.staffId]: e.target.value }))}
                          className="w-16 text-center border border-gray-200 rounded-md px-1.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                        />
                        <span className="text-gray-500 text-xs">%</span>
                        <button
                          onClick={() => handleRateSave(s.staffId)}
                          disabled={saving === s.staffId}
                          className="px-2 py-1 text-xs bg-pink-50 text-pink-600 border border-pink-200 rounded-md hover:bg-pink-100 disabled:opacity-50 transition-colors"
                        >
                          {saving === s.staffId ? '...' : '保存'}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-green-700">
                      ¥{s.compensation.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-5 py-3 font-bold text-gray-800">合計</td>
                  <td className="px-3 py-3 text-right font-bold text-blue-700">{totals.count}件</td>
                  <td className="px-3 py-3 text-right font-bold text-gray-800">¥{totals.revenue.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-bold text-gray-800">¥{totals.revenueExTax.toLocaleString()}</td>
                  <td></td>
                  <td className="px-5 py-3 text-right font-bold text-green-700">¥{totals.compensation.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
