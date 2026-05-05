'use client'

import { useEffect, useState } from 'react'
import { Menu, Staff } from '@/types/database'
import { timeToMinutes, minutesToTime, addMinutesToTime } from '@/lib/utils'

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

export default function StepTime({ date, menu, staff, settings, selectedTime, onSelect, onBack }: Props) {
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [loading, setLoading] = useState(true)

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
  const unavailableSlots = slots.filter((s) => !s.available)

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">時間を選択</h2>
      <p className="text-sm text-gray-500 mb-2">
        {menu.name}（{menu.duration_minutes}分）の開始時間をお選びください
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        </div>
      ) : availableSlots.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">😔</div>
          <p className="text-gray-700 font-medium mb-1">この日は満員です</p>
          <p className="text-gray-500 text-sm">別の日付やスタッフをお選びください</p>
          <button onClick={onBack} className="mt-4 btn-secondary text-sm">
            戻る
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {slots.map((slot) => (
              <button
                key={slot.time}
                disabled={!slot.available}
                onClick={() => onSelect(slot.time, slot.endTime)}
                className={`py-3 rounded-lg text-sm font-medium transition-all ${
                  selectedTime === slot.time
                    ? 'bg-pink-600 text-white shadow-md'
                    : slot.available
                    ? 'bg-white border border-gray-200 text-gray-700 hover:border-pink-400 hover:bg-pink-50'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                }`}
              >
                {slot.time}
                {!slot.available && (
                  <span className="block text-xs">×</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-white border border-gray-200 rounded" />
              <span>空き</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-gray-100 rounded" />
              <span>満員・受付不可</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-pink-600 rounded" />
              <span>選択中</span>
            </div>
          </div>

          <button onClick={onBack} className="btn-secondary w-full">
            戻る
          </button>
        </>
      )}
    </div>
  )
}
