'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Holiday {
  id: string
  holiday_date: string
  reason: string | null
}

export default function HolidayManager({ initialHolidays }: { initialHolidays: Holiday[] }) {
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays)
  const [date, setDate]         = useState('')
  const [reason, setReason]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleAdd = async () => {
    if (!date) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, reason }),
    })
    if (res.ok) {
      const newHoliday = await res.json()
      setHolidays(prev => [...prev, newHoliday].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)))
      setDate('')
      setReason('')
    } else {
      const data = await res.json()
      setError(data.error || '登録に失敗しました（すでに登録済みかもしれません）')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この休業日を削除しますか？')) return
    const res = await fetch('/api/admin/holidays', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setHolidays(prev => prev.filter(h => h.id !== id))
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy年M月d日(EEE)', { locale: ja })
    } catch {
      return dateStr
    }
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const upcoming = holidays.filter(h => h.holiday_date >= today)
  const past     = holidays.filter(h => h.holiday_date < today)

  return (
    <div className="max-w-lg space-y-5">

      {/* 追加フォーム */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4">休業日を追加</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-20 shrink-0">日付 *</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
              className="input-field text-sm w-44"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-20 shrink-0">理由</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="例：臨時休業、研修など（任意）"
              className="input-field text-sm flex-1"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleAdd}
            disabled={!date || saving}
            className="btn-primary text-sm"
          >
            {saving ? '登録中...' : '+ 休業日を登録'}
          </button>
        </div>
      </div>

      {/* 今後の休業日 */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-3">
          今後の休業日
          {upcoming.length > 0 && (
            <span className="ml-2 text-xs font-normal text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
              {upcoming.length}件
            </span>
          )}
        </h2>
        {upcoming.length > 0 ? (
          <ul className="space-y-2">
            {upcoming.map(h => (
              <li key={h.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{formatDate(h.holiday_date)}</p>
                  {h.reason && <p className="text-xs text-gray-400 mt-0.5">{h.reason}</p>}
                </div>
                <button
                  onClick={() => handleDelete(h.id)}
                  className="text-xs text-red-500 hover:underline shrink-0 ml-4"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">登録された休業日はありません</p>
        )}
      </div>

      {/* 過去の休業日 */}
      {past.length > 0 && (
        <div className="card p-5 bg-gray-50">
          <h2 className="font-bold text-gray-500 text-sm mb-3">過去の休業日</h2>
          <ul className="space-y-1">
            {past.slice(-5).reverse().map(h => (
              <li key={h.id} className="flex items-center justify-between py-1.5">
                <div>
                  <span className="text-sm text-gray-500">{formatDate(h.holiday_date)}</span>
                  {h.reason && <span className="text-xs text-gray-400 ml-2">{h.reason}</span>}
                </div>
                <button
                  onClick={() => handleDelete(h.id)}
                  className="text-xs text-gray-400 hover:text-red-500 hover:underline shrink-0 ml-4"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
