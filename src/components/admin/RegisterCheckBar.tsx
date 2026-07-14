'use client'

import { useState, useEffect } from 'react'

const DENOMS = [
  { value: 10000, label: '10,000円札' },
  { value: 5000,  label: '5,000円札'  },
  { value: 1000,  label: '1,000円札'  },
  { value: 500,   label: '500円玉'    },
  { value: 100,   label: '100円玉'    },
  { value: 50,    label: '50円玉'     },
  { value: 10,    label: '10円玉'     },
]

type DenomCounts = Record<number, number>

interface StoredData {
  denominations: DenomCounts
  base: number
}

interface CheckRecord {
  id?: string
  check_type: 'morning' | 'closing'
  amount: number
  notes: string
}

function parseNotes(notes: string): StoredData {
  try { return JSON.parse(notes) } catch { return { denominations: {}, base: 0 } }
}

function calcTotal(counts: DenomCounts): number {
  return DENOMS.reduce((s, d) => s + d.value * (counts[d.value] || 0), 0)
}

export default function RegisterCheckBar({ targetDate }: { targetDate: string }) {
  const [open, setOpen] = useState(false)

  const [mDenoms,  setMDenoms]  = useState<DenomCounts>({})
  const [mBase,    setMBase]    = useState<number>(0)
  const [mId,      setMId]      = useState<string | undefined>(undefined)

  const [cDenoms,  setCDenoms]  = useState<DenomCounts>({})
  const [cBase,    setCBase]    = useState<number>(0)
  const [cId,      setCId]      = useState<string | undefined>(undefined)

  const [saving,   setSaving]   = useState<'morning' | 'closing' | null>(null)
  const [saved,    setSaved]    = useState<'morning' | 'closing' | null>(null)

  useEffect(() => {
    setMDenoms({}); setMBase(0); setMId(undefined)
    setCDenoms({}); setCBase(0); setCId(undefined)
    fetch(`/api/admin/register-check?date=${targetDate}`)
      .then(r => r.json())
      .then((data: CheckRecord[]) => {
        data.forEach(d => {
          const parsed = parseNotes(d.notes || '')
          if (d.check_type === 'morning') {
            setMDenoms(parsed.denominations || {})
            setMBase(parsed.base || 0)
            setMId(d.id)
          } else {
            setCDenoms(parsed.denominations || {})
            setCBase(parsed.base || 0)
            setCId(d.id)
          }
        })
      })
      .catch(() => {})
  }, [targetDate])

  const handleSave = async (type: 'morning' | 'closing') => {
    setSaving(type)
    const denoms = type === 'morning' ? mDenoms : cDenoms
    const base   = type === 'morning' ? mBase   : cBase
    const total  = calcTotal(denoms)
    const notes  = JSON.stringify({ denominations: denoms, base })

    const res = await fetch('/api/admin/register-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: targetDate, check_type: type, amount: total, notes }),
    })
    if (res.ok) {
      const saved = await res.json()
      if (type === 'morning') setMId(saved.id)
      else                    setCId(saved.id)
      setSaved(type)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
  }

  const mTotal = calcTotal(mDenoms)
  const cTotal = calcTotal(cDenoms)

  return (
    <div className="mb-4 bg-white border border-emerald-200 rounded-xl overflow-hidden">
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
            {mId
              ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">朝 ¥{mTotal.toLocaleString()}</span>
              : <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">朝 未記録</span>
            }
            {cId
              ? <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">閉店 ¥{cTotal.toLocaleString()}</span>
              : <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">閉店 未記録</span>
            }
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <div className="border-t border-emerald-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <CheckPanel
            label="朝のレジ金"
            labelColor="emerald"
            denoms={mDenoms}
            base={mBase}
            hasRecord={!!mId}
            onDenomChange={setMDenoms}
            onBaseChange={setMBase}
            onSave={() => handleSave('morning')}
            saving={saving === 'morning'}
            justSaved={saved === 'morning'}
          />
          <CheckPanel
            label="閉店後のレジ金"
            labelColor="blue"
            denoms={cDenoms}
            base={cBase}
            hasRecord={!!cId}
            onDenomChange={setCDenoms}
            onBaseChange={setCBase}
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
  label, labelColor, denoms, base, hasRecord,
  onDenomChange, onBaseChange, onSave, saving, justSaved,
}: {
  label: string
  labelColor: 'emerald' | 'blue'
  denoms: DenomCounts
  base: number
  hasRecord: boolean
  onDenomChange: (d: DenomCounts) => void
  onBaseChange:  (n: number) => void
  onSave: () => void
  saving: boolean
  justSaved: boolean
}) {
  const color = labelColor === 'emerald'
    ? { header: 'text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' }
    : { header: 'text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-700',       badge: 'bg-blue-100 text-blue-700',       border: 'border-blue-200' }

  const total = calcTotal(denoms)
  const diff  = total - base

  const setCount = (denom: number, val: string) => {
    const n = parseInt(val) || 0
    onDenomChange({ ...denoms, [denom]: n < 0 ? 0 : n })
  }

  return (
    <div className="space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <p className={`text-sm font-bold ${color.header}`}>{label}</p>
        {hasRecord && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color.badge}`}>記録済み</span>}
      </div>

      {/* 券種入力テーブル */}
      <div className={`border ${color.border} rounded-xl overflow-hidden`}>
        <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-100 px-3 py-1.5">
          <span className="text-[10px] font-semibold text-gray-400 uppercase">券種</span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase text-center">枚数</span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase text-right">小計</span>
        </div>
        {DENOMS.map((d, i) => {
          const count   = denoms[d.value] || 0
          const sub     = d.value * count
          const isLast  = i === DENOMS.length - 1
          return (
            <div key={d.value} className={`grid grid-cols-3 items-center px-3 py-2 ${!isLast ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50 transition-colors`}>
              <span className="text-xs font-medium text-gray-600">{d.label}</span>
              <div className="flex justify-center">
                <input
                  type="number"
                  min={0}
                  value={count || ''}
                  onChange={e => setCount(d.value, e.target.value)}
                  placeholder="0"
                  className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:border-gray-400 tabular-nums"
                />
              </div>
              <span className={`text-xs font-semibold text-right tabular-nums ${sub > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                {sub > 0 ? `¥${sub.toLocaleString()}` : '—'}
              </span>
            </div>
          )
        })}

        {/* 合計行 */}
        <div className="grid grid-cols-3 items-center px-3 py-2.5 bg-gray-50 border-t border-gray-200">
          <span className="text-xs font-bold text-gray-700">合計</span>
          <span />
          <span className="text-sm font-bold text-gray-900 text-right tabular-nums">
            ¥{total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 元のレジ金 */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">元のレジ金（比較用）</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">¥</span>
          <input
            type="number"
            min={0}
            value={base || ''}
            onChange={e => onBaseChange(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full pl-7 pr-3 py-2 border-2 border-gray-200 focus:border-gray-400 rounded-xl text-right text-base font-bold tabular-nums focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* 差額表示 */}
      {base > 0 && (
        <div className={`rounded-xl px-4 py-3 border flex items-center justify-between ${
          diff === 0
            ? 'bg-green-50 border-green-200'
            : diff > 0
              ? 'bg-blue-50 border-blue-200'
              : 'bg-red-50 border-red-200'
        }`}>
          <span className={`text-sm font-semibold ${diff === 0 ? 'text-green-700' : diff > 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {diff === 0 ? '✓ 差額なし（OK）' : diff > 0 ? '過剰' : '不足'}
          </span>
          {diff !== 0 && (
            <span className={`text-xl font-bold tabular-nums ${diff > 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {diff > 0 ? '+' : ''}¥{diff.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* 保存ボタン */}
      <button
        onClick={onSave}
        disabled={saving}
        className={`w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 ${
          justSaved ? 'bg-green-500' : color.btn
        }`}
      >
        {justSaved ? '✓ 保存しました' : saving ? '保存中...' : hasRecord ? '更新する' : '記録する'}
      </button>
    </div>
  )
}
