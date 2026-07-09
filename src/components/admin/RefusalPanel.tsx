'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

const REASONS = [
  '満席（ベッド満床）',
  'スタッフ不足',
  '時間外',
  'メニュー対応不可',
  'その他',
]

interface Refusal {
  id: string
  refusal_date: string
  refusal_time: string
  reason: string
  notes: string | null
}

export default function RefusalPanel({ targetDate, initialRefusals }: {
  targetDate: string
  initialRefusals: Refusal[]
}) {
  const [refusals, setRefusals] = useState<Refusal[]>(initialRefusals)
  const [open, setOpen] = useState(false)
  const [time, setTime] = useState(() => format(new Date(), 'HH:mm'))
  const [reason, setReason] = useState(REASONS[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/refusals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: targetDate, time, reason, notes }),
    })
    if (res.ok) {
      const newItem = await res.json()
      setRefusals(prev => [...prev, newItem].sort((a, b) => a.refusal_time.localeCompare(b.refusal_time)))
      setNotes('')
      setOpen(false)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/refusals?id=${id}`, { method: 'DELETE' })
    setRefusals(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" style={{ color: '#c2410c', opacity: 0.7 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
          <span className="text-xs font-medium" style={{ color: '#c2410c', opacity: 0.7 }}>断り件数</span>
        </div>
        <button
          onClick={() => { setTime(format(new Date(), 'HH:mm')); setOpen(true) }}
          className="text-xs px-2 py-0.5 rounded-md font-semibold transition-colors"
          style={{ backgroundColor: '#c2410c', color: 'white' }}
        >
          ＋ 記録
        </button>
      </div>

      {/* 件数 */}
      <div className="text-xl font-bold mb-2" style={{ color: '#c2410c' }}>
        {refusals.length}件
      </div>

      {/* 断り一覧 */}
      {refusals.length > 0 && (
        <ul className="space-y-1">
          {refusals.map(r => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1" style={{ backgroundColor: '#ffedd5' }}>
              <span className="font-mono font-semibold" style={{ color: '#9a3412' }}>
                {r.refusal_time.slice(0, 5)}
              </span>
              <span className="flex-1 text-gray-700">{r.reason}</span>
              {r.notes && <span className="text-gray-400 truncate max-w-[80px]">{r.notes}</span>}
              <button
                onClick={() => handleDelete(r.id)}
                className="text-gray-300 hover:text-red-400 transition-colors ml-1"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 記録モーダル */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">断りを記録</h2>

            {/* 時刻 */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">時刻</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* 理由 */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">理由</label>
              <div className="grid grid-cols-1 gap-1.5">
                {REASONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      reason === r
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-orange-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* メモ */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 mb-1">メモ（任意）</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="例：2名でご来店"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '記録する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
