'use client'

import { useEffect, useState } from 'react'
import { Menu, Staff } from '@/types/database'

interface Props {
  date: string
  menu: Menu
  staff: Staff | null
  settings: Record<string, string>
  selectedTime: string | null
  onSelect: (time: string, endTime: string) => void
  onBack: () => void
}

interface AvailableSlot {
  time: string
  endTime: string
  available: boolean
}

function getCurrentTimeStr() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export default function StepTime({ date, menu, staff, settings, selectedTime, onSelect, onBack }: Props) {
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(getCurrentTimeStr())
  const [showPicker, setShowPicker] = useState(false)

  // 現在時刻を30秒ごとに更新
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getCurrentTimeStr()), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          date,
          menuId: menu.id,
          ...(staff ? { staffId: staff.id } : {}),
        })
        const res = await fetch(`/api/availability?${params}`)
        const data = await res.json()
        setSlots(data.slots || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchAvailability()
  }, [date, menu.id, staff?.id])

  const availableSlots = slots.filter((s) => s.available)
  const earliestSlot = availableSlots[0] || null

  // 時間帯でグループ分け
  const morningSlots = availableSlots.filter((s) => parseInt(s.time.split(':')[0]) < 12)
  const afternoonSlots = availableSlots.filter((s) => {
    const h = parseInt(s.time.split(':')[0])
    return h >= 12 && h < 18
  })
  const eveningSlots = availableSlots.filter((s) => parseInt(s.time.split(':')[0]) >= 18)

  const groups = [
    { label: '午前', sublabel: '10:00〜11:59', slots: morningSlots },
    { label: '午後', sublabel: '12:00〜17:59', slots: afternoonSlots },
    { label: '夜間', sublabel: '18:00〜', slots: eveningSlots },
  ].filter((g) => g.slots.length > 0)

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">時間を選択</h2>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (availableSlots.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">時間を選択</h2>
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">😔</div>
          <p className="text-gray-700 font-medium mb-1">この日は満員です</p>
          <p className="text-gray-500 text-sm">別の日付やスタッフをお選びください</p>
          <button onClick={onBack} className="mt-4 btn-secondary text-sm">
            戻る
          </button>
        </div>
      </div>
    )
  }

  // 時間指定ピッカー画面
  if (showPicker) {
    return (
      <div>
        <button
          onClick={() => setShowPicker(false)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          選択画面に戻る
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-1">時間を指定する</h2>
        <p className="text-sm text-gray-500 mb-5">
          {menu.name}（{menu.duration_minutes}分）の開始時間をお選びください
        </p>

        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-sm font-bold text-gray-700">{group.label}</h3>
                <span className="text-xs text-gray-400">{group.sublabel}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {group.slots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => onSelect(slot.time, slot.endTime)}
                    className={`py-3 rounded-lg text-sm font-medium transition-all ${
                      selectedTime === slot.time
                        ? 'bg-pink-600 text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-pink-400 hover:bg-pink-50'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={onBack} className="btn-secondary w-full mt-6">
          戻る
        </button>
      </div>
    )
  }

  // メイン画面
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">時間を選択</h2>
      <p className="text-sm text-gray-500 mb-6">
        {menu.name}（{menu.duration_minutes}分）の開始時間をお選びください
      </p>

      {/* 現在時刻 */}
      <div className="text-center mb-6">
        <p className="text-xs text-gray-400 mb-1">現在時刻</p>
        <p className="text-3xl font-bold text-gray-800 tabular-nums">{currentTime}</p>
      </div>

      <div className="space-y-3">
        {/* 今すぐ予約ボタン */}
        {earliestSlot && (
          <button
            onClick={() => onSelect(earliestSlot.time, earliestSlot.endTime)}
            className="w-full bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-2xl p-5 text-left transition-all shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-pink-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                <div>
                  <div className="font-bold text-lg leading-tight">今すぐ予約</div>
                  <div className="text-pink-200 text-sm mt-0.5">
                    {earliestSlot.time}〜{earliestSlot.endTime} にご案内できます
                  </div>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}

        {/* 時間を指定するボタン */}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full bg-white border-2 border-gray-200 hover:border-pink-400 hover:bg-pink-50 text-gray-700 rounded-2xl p-5 text-left transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <div>
                <div className="font-bold text-lg leading-tight text-gray-800">時間を指定する</div>
                <div className="text-gray-400 text-sm mt-0.5">ご希望の時間帯からお選びください</div>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      <button onClick={onBack} className="btn-secondary w-full mt-4">
        戻る
      </button>
    </div>
  )
}
