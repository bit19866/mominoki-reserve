'use client'

import { useState, useEffect } from 'react'

interface CheckRecord {
  id?: string
  check_type: 'morning' | 'closing'
  amount: number
  notes: string
}

const PRESETS = [10000, 20000, 30000, 50000]

export default function RegisterCheckBar({ targetDate }: { targetDate: string }) {
  const [morning,  setMorning]  = useState<CheckRecord>({ check_type: 'morning',  amount: 0, notes: '' })
  const [closing,  setClosing]  = useState<CheckRecord>({ check_type: 'closing',  amount: 0, notes: '' })
  const [saving,   setSaving]   = useState<'morning' | 'closing' | null>(null)
  const [saved,    setSaved]    = useState<'morning' | 'closing' | null>(null)
  const [open,     setOpen]     = useState(false)

  useEffect(() => {
    setMorning({ check_type: 'morning', amount: 0, notes: '' })
    setClosing({ check_type: 'closing', amount: 0, notes: '' })
    fetch(`/api/admin/register-check?date=${targetDate}`)
      .then(r => r.json())
      .then((data: CheckRecord[]) => {
        data.forEach(d => {
          if (d.check_type === 'morning') setMorning(d)
          if (d.check_type === 'closing') setClosing(d)
        })
      })
      .catch(() => {})
  }, [targetDate])

  const handleSave = async (type: 'morning' | 'closing') => {
    setSaving(type)
    const rec = type === 'morning' ? morning : closing
    const res = await fetch('/api/admin/register-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: targetDate, check_type: type, amount: rec.amount, notes: rec.notes }),
    })
    if (res.ok) {
      const saved = await res.json()
      if (type === 'morning') setMorning(saved)
      else                    setClosing(saved)
      setSaved(type)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
  }

  const hasMorning = !!morning.id
  const hasClosing = !!closing.id

  return (
    <div className="mb-4 bg-white border border-emerald-200 rounded-xl overflow-hidden">
      {/* ヘッダー（折りたたみトグル） */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-emerald-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
          </svg>
          <span className="text-sm font-bold text-gray-800">レジ金確認</span>
          <div className="flex items-center gap-3 text-xs">
            {hasMorning
              ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">朝 ¥{morning.amount.toLocaleString()}</span>
              : <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">朝 未記録</span>
            }
            {hasClosing
              ? <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">閉店 ¥{closing.amount.toLocaleString()}</span>
              : <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">閉店 未記録</span>
            }
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {/* 展開パネル */}
      {open && (
        <div className="border-t border-emerald-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CheckPanel
            label="朝のレジ金"
            labelColor="emerald"
            record={morning}
            onChange={setMorning}
            onSave={() => handleSave('morning')}
            saving={saving === 'morning'}
            justSaved={saved === 'morning'}
          />
          <CheckPanel
            label="閉店後のレジ金"
            labelColor="blue"
            record={closing}
            onChange={setClosing}
            onSave={() => handleSave('closing')}
            saving={saving === 'closing'}
            justSaved={saved === 'closing'}
          />
        </div>
      )}
    </div>
  )
}

function CheckPanel({
  label, labelColor, record, onChange, onSave, saving, justSaved,
}: {
  label: string
  labelColor: 'emerald' | 'blue'
  record: CheckRecord
  onChange: (r: CheckRecord) => void
  onSave: () => void
  saving: boolean
  justSaved: boolean
}) {
  const color = labelColor === 'emerald'
    ? { ring: 'focus:border-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-700', badge: 'bg-emerald-100 text-emerald-700' }
    : { ring: 'focus:border-blue-400',    btn: 'bg-blue-600 hover:bg-blue-700',       badge: 'bg-blue-100 text-blue-700' }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-gray-600">{label}</p>
        {record.id && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color.badge}`}>記録済み</span>
        )}
      </div>

      {/* 金額入力 */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">¥</span>
        <input
          type="number"
          value={record.amount || ''}
          onChange={e => onChange({ ...record, amount: parseInt(e.target.value) || 0 })}
          placeholder="0"
          className={`w-full pl-7 pr-3 py-2.5 border-2 border-gray-200 ${color.ring} rounded-xl text-right text-xl font-bold tabular-nums focus:outline-none transition-colors`}
        />
      </div>

      {/* プリセット */}
      <div className="flex gap-1.5">
        {PRESETS.map(n => (
          <button
            key={n}
            onClick={() => onChange({ ...record, amount: n })}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              record.amount === n ? `${color.btn} text-white` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {n >= 10000 ? `${n / 10000}万` : `${n / 1000}千`}
          </button>
        ))}
      </div>

      {/* メモ */}
      <input
        type="text"
        value={record.notes}
        onChange={e => onChange({ ...record, notes: e.target.value })}
        placeholder="メモ（任意）"
        className="w-full border border-gray-200 focus:border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none transition-colors"
      />

      {/* 保存ボタン */}
      <button
        onClick={onSave}
        disabled={saving}
        className={`w-full py-2 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 ${
          justSaved ? 'bg-green-500' : color.btn
        }`}
      >
        {justSaved ? '✓ 保存しました' : saving ? '保存中...' : record.id ? '更新する' : '記録する'}
      </button>
    </div>
  )
}
