'use client'

import { useState, useRef, useEffect } from 'react'

const REASONS = ['満席', 'コースの対応ができない', '男女', '指名のスタッフがいない', 'ペア断り']
const MINUTES = ['00', '10', '20', '30', '40', '50']

interface Refusal {
  id: string
  refusal_date: string
  refusal_time: string
  reason: string
  notes: string | null
}

function buildHours() {
  const hours = []
  for (let h = 10; h <= 23; h++) hours.push(String(h).padStart(2, '0'))
  return hours
}

export default function QuickRefusalBar({ targetDate, initialRefusals }: {
  targetDate: string
  initialRefusals: Refusal[]
}) {
  const [refusals, setRefusals] = useState<Refusal[]>(initialRefusals)
  // popup: { hour } → 分選択中  /  { hour, minute } → 理由選択中
  const [popup, setPopup] = useState<{ hour: string; minute?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const hours = buildHours()

  // 現在時刻
  const now = new Date()
  const nowHour = String(now.getHours()).padStart(2, '0')
  const nowMinute = String(Math.floor(now.getMinutes() / 10) * 10).padStart(2, '0')

  useEffect(() => {
    if (!popup) return
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popup])

  const handleRecord = async (hour: string, minute: string, reason: string) => {
    setSaving(true)
    setPopup(null)
    const time = `${hour}:${minute}`
    const isPair = reason === 'ペア断り'
    const count  = isPair ? 2 : 1
    const newItems: Refusal[] = []
    for (let i = 0; i < count; i++) {
      const res = await fetch('/api/admin/refusals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: targetDate, time, reason, notes: '' }),
      })
      if (res.ok) newItems.push(await res.json())
    }
    if (newItems.length > 0) {
      setRefusals(prev => [...prev, ...newItems].sort((a, b) => a.refusal_time.localeCompare(b.refusal_time)))
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/refusals?id=${id}`, { method: 'DELETE' })
    setRefusals(prev => prev.filter(r => r.id !== id))
  }

  const countByHour = (hour: string) =>
    refusals.filter(r => r.refusal_time.slice(0, 2) === hour).length

  return (
    <div className="mb-4 bg-white border border-orange-200 rounded-xl p-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
          <span className="text-sm font-bold text-gray-800">断り記録</span>
          <span className="text-xs text-gray-400">時間 → 分 → 理由 の順に押す</span>
        </div>
        <span className="text-sm font-bold text-orange-600">本日 {refusals.length}件</span>

      </div>

      {/* 時間ボタン */}
      <div className="relative flex flex-wrap gap-1.5">
        {hours.map(hour => {
          const count = countByHour(hour)
          const isNow = hour === nowHour
          const isOpen = popup?.hour === hour

          return (
            <div key={hour} className="relative">
              <button
                onClick={() => setPopup(isOpen ? null : { hour })}
                className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isOpen
                    ? 'bg-orange-600 text-white border-orange-600'
                    : count > 0
                    ? 'bg-orange-100 text-orange-700 border-orange-300'
                    : isNow
                    ? 'bg-blue-50 text-blue-600 border-blue-300'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-orange-50 hover:border-orange-300'
                }`}
              >
                <span>{hour}時</span>
                {count > 0 && (
                  <span className={`text-[10px] font-bold ${isOpen ? 'text-orange-200' : 'text-orange-500'}`}>
                    ×{count}
                  </span>
                )}
              </button>

              {/* ポップアップ */}
              {isOpen && (
                <div
                  ref={popupRef}
                  className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3"
                  style={{ minWidth: 200 }}
                >
                  {!popup.minute ? (
                    /* ── ステップ1: 分を選ぶ ── */
                    <>
                      <p className="text-[11px] text-gray-400 mb-2">{hour}時 — 何分？</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {MINUTES.map(min => (
                          <button
                            key={min}
                            onClick={() => setPopup({ hour, minute: min })}
                            className={`py-2 rounded-lg text-sm font-bold border transition-colors ${
                              min === nowMinute && hour === nowHour
                                ? 'bg-blue-50 text-blue-600 border-blue-300'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-orange-50 hover:border-orange-400'
                            }`}
                          >
                            {hour}:{min}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* ── ステップ2: 理由を選ぶ ── */
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => setPopup({ hour })}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ←
                        </button>
                        <p className="text-[11px] text-gray-400">{hour}:{popup.minute} — 理由は？</p>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {REASONS.map(r => (
                          <button
                            key={r}
                            onClick={() => handleRecord(hour, popup.minute!, r)}
                            disabled={saving}
                            className="w-full text-left px-3 py-2.5 text-sm rounded-lg font-semibold border border-gray-200 hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-colors disabled:opacity-50"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 記録済み一覧 */}
      {refusals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-orange-100 flex flex-wrap gap-1.5">
          {refusals.map(r => (
            <div key={r.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
              r.reason === 'ペア断り'
                ? 'bg-purple-50 border-purple-200'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <span className={`font-mono font-bold ${r.reason === 'ペア断り' ? 'text-purple-700' : 'text-orange-700'}`}>
                {r.refusal_time.slice(0, 5)}
              </span>
              <span className="text-gray-600">{r.reason}</span>
              {r.reason === 'ペア断り' && (
                <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-purple-100 text-purple-600">×1</span>
              )}
              <button onClick={() => handleDelete(r.id)} className="text-gray-300 hover:text-red-400 ml-0.5">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
