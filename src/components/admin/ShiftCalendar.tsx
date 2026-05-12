'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Staff {
  id: string
  name: string
}

interface Override {
  staff_id: string
  override_date: string
  is_working: boolean
  start_time: string | null
  end_time: string | null
}

interface WeeklySchedule {
  staff_id: string
  day_of_week: number
  is_working: boolean
  start_time: string | null
  end_time: string | null
}

interface Props {
  staff: Staff[]
  overrides: Override[]
  weeklySchedules: WeeklySchedule[]
  monthStr: string
  year: number
  month: number
  lastDay: number
  defaultStart: string
  defaultEnd: string
}

interface EditState {
  staffId: string
  date: string
  isWorking: boolean
  startTime: string
  endTime: string
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export default function ShiftCalendar({
  staff, overrides, weeklySchedules,
  monthStr, year, month, lastDay,
  defaultStart, defaultEnd,
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [localOverrides, setLocalOverrides] = useState<Override[]>(overrides)

  // 日付の配列を生成
  const dates = Array.from({ length: lastDay }, (_, i) => {
    const d = i + 1
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`
    const dayOfWeek = new Date(dateStr).getDay()
    return { day: d, dateStr, dayOfWeek }
  })

  // overrideマップ
  const overrideMap = new Map<string, Override>()
  localOverrides.forEach((o) => {
    overrideMap.set(`${o.staff_id}_${o.override_date}`, o)
  })

  // weeklyマップ
  const weeklyMap = new Map<string, WeeklySchedule>()
  weeklySchedules.forEach((w) => {
    weeklyMap.set(`${w.staff_id}_${w.day_of_week}`, w)
  })

  // セルの値を取得
  const getCellInfo = (staffId: string, dateStr: string, dayOfWeek: number) => {
    const override = overrideMap.get(`${staffId}_${dateStr}`)
    if (override) {
      return {
        isWorking: override.is_working,
        startTime: override.start_time?.slice(0, 5) || defaultStart,
        endTime: override.end_time?.slice(0, 5) || defaultEnd,
        source: 'override' as const,
      }
    }
    const weekly = weeklyMap.get(`${staffId}_${dayOfWeek}`)
    if (weekly) {
      return {
        isWorking: weekly.is_working,
        startTime: weekly.start_time?.slice(0, 5) || defaultStart,
        endTime: weekly.end_time?.slice(0, 5) || defaultEnd,
        source: 'weekly' as const,
      }
    }
    return {
      isWorking: true,
      startTime: defaultStart,
      endTime: defaultEnd,
      source: 'default' as const,
    }
  }

  // セルをクリック → 編集開始
  const handleCellClick = (staffId: string, dateStr: string, dayOfWeek: number) => {
    const current = getCellInfo(staffId, dateStr, dayOfWeek)
    setEditing({
      staffId,
      date: dateStr,
      isWorking: current.isWorking,
      startTime: current.startTime,
      endTime: current.endTime,
    })
  }

  // 保存
  const handleSave = async () => {
    if (!editing) return
    setSaving(true)

    await fetch('/api/shift-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'override',
        staffId: editing.staffId,
        overrideDate: editing.date,
        isWorking: editing.isWorking,
        startTime: editing.isWorking ? editing.startTime : null,
        endTime: editing.isWorking ? editing.endTime : null,
      }),
    })

    // ローカル状態を更新
    const key = `${editing.staffId}_${editing.date}`
    setLocalOverrides((prev) => {
      const filtered = prev.filter(
        (o) => !(o.staff_id === editing.staffId && o.override_date === editing.date)
      )
      return [
        ...filtered,
        {
          staff_id: editing.staffId,
          override_date: editing.date,
          is_working: editing.isWorking,
          start_time: editing.isWorking ? editing.startTime : null,
          end_time: editing.isWorking ? editing.endTime : null,
        },
      ]
    })

    setSaving(false)
    setEditing(null)
  }

  // リセット（週間シフトに戻す）
  const handleReset = async (staffId: string, dateStr: string) => {
    await fetch('/api/shift-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'override',
        staffId,
        overrideDate: dateStr,
        isWorking: null,
      }),
    })
    setLocalOverrides((prev) =>
      prev.filter((o) => !(o.staff_id === staffId && o.override_date === dateStr))
    )
    setEditing(null)
  }

  // 月ナビゲーション
  const goMonth = (delta: number) => {
    const current = new Date(year, month - 1, 1)
    const next = delta > 0 ? addMonths(current, 1) : subMonths(current, 1)
    router.push(`/admin/shifts?month=${format(next, 'yyyy-MM')}`)
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div>
      {/* 月ナビゲーション */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => goMonth(-1)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
        >
          ← 前月
        </button>
        <span className="text-lg font-bold text-gray-900">
          {year}年{month}月
        </span>
        <button
          onClick={() => goMonth(1)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
        >
          翌月 →
        </button>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-10 h-5 bg-green-100 border border-green-300 rounded text-center text-green-700 text-xs leading-5">出勤</div>
          <span>出勤（週間シフト）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-10 h-5 bg-blue-100 border border-blue-300 rounded text-center text-blue-700 text-xs leading-5">変更</div>
          <span>個別設定あり</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-10 h-5 bg-gray-100 border border-gray-300 rounded text-center text-gray-400 text-xs leading-5">休み</div>
          <span>休み</span>
        </div>
        <span className="ml-2 text-gray-400">※ セルをクリックして編集</span>
      </div>

      {/* シフト表 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr className="bg-gray-800 text-white">
                <th
                  className="sticky left-0 z-20 bg-gray-800 text-left px-3 py-2 font-medium border-r border-gray-600"
                  style={{ minWidth: 72 }}
                >
                  スタッフ
                </th>
                {dates.map(({ day, dateStr, dayOfWeek }) => (
                  <th
                    key={day}
                    className={`px-1 py-2 font-medium border-r border-gray-700 text-center ${
                      dateStr === today ? 'bg-pink-700' : ''
                    }`}
                    style={{ minWidth: 52 }}
                  >
                    <div
                      className={
                        dayOfWeek === 0
                          ? 'text-red-300'
                          : dayOfWeek === 6
                          ? 'text-blue-300'
                          : 'text-gray-200'
                      }
                    >
                      {day}
                    </div>
                    <div
                      className={`text-xs ${
                        dayOfWeek === 0
                          ? 'text-red-400'
                          : dayOfWeek === 6
                          ? 'text-blue-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {WEEKDAY_LABELS[dayOfWeek]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s, si) => (
                <tr
                  key={s.id}
                  className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  {/* スタッフ名 */}
                  <td
                    className="sticky left-0 z-10 px-3 py-2 font-bold text-gray-800 border-r border-gray-200 border-b"
                    style={{ background: si % 2 === 0 ? 'white' : '#f9fafb' }}
                  >
                    {s.name}
                  </td>

                  {/* 各日のセル */}
                  {dates.map(({ day, dateStr, dayOfWeek }) => {
                    const info = getCellInfo(s.id, dateStr, dayOfWeek)
                    const isOverride = overrideMap.has(`${s.id}_${dateStr}`)
                    const isToday = dateStr === today

                    return (
                      <td
                        key={day}
                        onClick={() => handleCellClick(s.id, dateStr, dayOfWeek)}
                        className={`border-r border-b border-gray-100 text-center cursor-pointer transition-all hover:ring-2 hover:ring-pink-300 hover:z-10 relative ${
                          isToday ? 'ring-1 ring-pink-400' : ''
                        }`}
                        style={{ minWidth: 52, height: 48, padding: '2px' }}
                      >
                        {info.isWorking ? (
                          <div
                            className={`h-full rounded flex flex-col items-center justify-center ${
                              isOverride
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-50 text-green-800'
                            }`}
                          >
                            <span className="font-bold leading-tight">
                              {info.startTime.slice(0, 5)}
                            </span>
                            <span className="text-gray-400 text-xs leading-none">〜</span>
                            <span className="font-bold leading-tight">
                              {info.endTime.slice(0, 5)}
                            </span>
                            {isOverride && (
                              <span className="text-blue-500 text-xs">●</span>
                            )}
                          </div>
                        ) : (
                          <div className="h-full rounded bg-gray-100 flex items-center justify-center text-gray-400 font-medium">
                            休
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 編集モーダル */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">
              {staff.find((s) => s.id === editing.staffId)?.name} さん
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {format(new Date(editing.date), 'M月d日(EEE)', { locale: ja })}
            </p>

            {/* 出勤・休みトグル */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setEditing((e) => e && { ...e, isWorking: true })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  editing.isWorking
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                出勤
              </button>
              <button
                onClick={() => setEditing((e) => e && { ...e, isWorking: false })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  !editing.isWorking
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                休み
              </button>
            </div>

            {/* 時間設定 */}
            {editing.isWorking && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">開始</label>
                  <input
                    type="time"
                    value={editing.startTime}
                    onChange={(e) =>
                      setEditing((ed) => ed && { ...ed, startTime: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <span className="text-gray-400 mt-5">〜</span>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">終了</label>
                  <input
                    type="time"
                    value={editing.endTime}
                    onChange={(e) =>
                      setEditing((ed) => ed && { ...ed, endTime: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
            )}

            {/* ボタン */}
            <div className="space-y-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl disabled:opacity-60 transition-colors"
              >
                {saving ? '保存中...' : '保存する'}
              </button>
              {overrideMap.has(`${editing.staffId}_${editing.date}`) && (
                <button
                  onClick={() => handleReset(editing.staffId, editing.date)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-2 rounded-xl transition-colors"
                >
                  週間シフトに戻す
                </button>
              )}
              <button
                onClick={() => setEditing(null)}
                className="w-full text-gray-400 text-sm py-2 hover:text-gray-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
