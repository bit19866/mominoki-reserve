'use client'

import { useState, useEffect } from 'react'
import { Staff } from '@/types/database'

interface Props {
  staff: Staff
  defaultStart: string
  defaultEnd: string
}

const DAYS = [
  { label: '日', value: 0 },
  { label: '月', value: 1 },
  { label: '火', value: 2 },
  { label: '水', value: 3 },
  { label: '木', value: 4 },
  { label: '金', value: 5 },
  { label: '土', value: 6 },
]

interface DaySchedule {
  dayOfWeek: number
  isWorking: boolean
  startTime: string
  endTime: string
}

export default function WeeklyScheduleEditor({ staff, defaultStart, defaultEnd }: Props) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    DAYS.map((d) => ({
      dayOfWeek: d.value,
      isWorking: true,
      startTime: defaultStart,
      endTime: defaultEnd,
    }))
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<number | null>(null)

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch(`/api/shift-hours?staffId=${staff.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.weeklySchedule && data.weeklySchedule.length > 0) {
          setSchedule((prev) =>
            prev.map((day) => {
              const found = data.weeklySchedule.find(
                (w: any) => w.day_of_week === day.dayOfWeek
              )
              if (found) {
                return {
                  dayOfWeek: day.dayOfWeek,
                  isWorking: found.is_working,
                  startTime: found.start_time?.slice(0, 5) || defaultStart,
                  endTime: found.end_time?.slice(0, 5) || defaultEnd,
                }
              }
              return day
            })
          )
        }
      } catch (e) {
        console.error('週間シフト取得エラー:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchSchedule()
  }, [staff.id])

  const handleSave = async (dayOfWeek: number) => {
    setSaving(dayOfWeek)
    const day = schedule.find((d) => d.dayOfWeek === dayOfWeek)!

    const res = await fetch('/api/shift-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'weekly',
        staffId: staff.id,
        dayOfWeek: day.dayOfWeek,
        isWorking: day.isWorking,
        startTime: day.isWorking ? day.startTime : null,
        endTime: day.isWorking ? day.endTime : null,
      }),
    })

    setSaving(null)
    if (!res.ok) {
      alert('保存に失敗しました。もう一度お試しください。')
      return
    }
    setSaved(dayOfWeek)
    setTimeout(() => setSaved(null), 2000)
  }

  const updateDay = (dayOfWeek: number, updates: Partial<DaySchedule>) => {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...updates } : d))
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-5 h-5 border-2 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <p className="text-xs font-bold text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 inline mr-1 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {staff.name} さんの週間シフト
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          曜日ごとの基本シフトを設定します
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {DAYS.map((day) => {
          const dayData = schedule.find((d) => d.dayOfWeek === day.value)!
          const isSaving = saving === day.value
          const isSaved = saved === day.value

          return (
            <div key={day.value} className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-3">
                {/* 曜日 */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    day.value === 0
                      ? 'bg-red-100 text-red-600'
                      : day.value === 6
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {day.label}
                </div>

                {/* 出勤・休みボタン */}
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => updateDay(day.value, { isWorking: true })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      dayData.isWorking
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-green-300 hover:text-green-600'
                    }`}
                  >
                    出勤
                  </button>
                  <button
                    onClick={() => updateDay(day.value, { isWorking: false })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      !dayData.isWorking
                        ? 'bg-gray-500 text-white border-gray-500'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600'
                    }`}
                  >
                    休み
                  </button>
                </div>

                {/* 時間設定 */}
                {dayData.isWorking ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="time"
                      value={dayData.startTime}
                      onChange={(e) => updateDay(day.value, { startTime: e.target.value })}
                      className="border border-gray-200 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-pink-400"
                    />
                    <span className="text-gray-400 text-xs">〜</span>
                    <input
                      type="time"
                      value={dayData.endTime}
                      onChange={(e) => updateDay(day.value, { endTime: e.target.value })}
                      className="border border-gray-200 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-pink-400"
                    />
                  </div>
                ) : (
                  <div className="flex-1 text-xs text-gray-400">この曜日は休みです</div>
                )}

                {/* 保存ボタン */}
                <button
                  onClick={() => handleSave(day.value)}
                  disabled={isSaving}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    isSaved
                      ? 'bg-green-100 text-green-600'
                      : 'bg-pink-600 hover:bg-pink-700 text-white'
                  } disabled:opacity-50`}
                >
                  {isSaving ? '...' : isSaved ? '✓ 保存' : '保存'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
