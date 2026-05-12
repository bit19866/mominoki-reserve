'use client'

import { useState, useEffect } from 'react'
import { Staff } from '@/types/database'

interface Props {
  staff: Staff[]
  targetDate: string
  initialOffStaffIds: string[]
}

const STAFF_ICONS = ['🌸', '🌿', '🍀', '🌺', '🌻', '🌼', '🌷', '🌹', '🪷']

export default function StaffAttendance({ staff, targetDate, initialOffStaffIds }: Props) {
  const [offStaffIds, setOffStaffIds] = useState<Set<string>>(new Set(initialOffStaffIds))
  const [loading, setLoading] = useState<string | null>(null)

  const isWorking = (staffId: string) => !offStaffIds.has(staffId)

  const toggleAttendance = async (staffId: string) => {
    setLoading(staffId)
    const currentlyWorking = isWorking(staffId)

    try {
      const res = await fetch('/api/staff-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          date: targetDate,
          isWorking: !currentlyWorking,
        }),
      })

      if (res.ok) {
        setOffStaffIds((prev) => {
          const next = new Set(prev)
          if (currentlyWorking) {
            next.add(staffId)
          } else {
            next.delete(staffId)
          }
          return next
        })
      }
    } finally {
      setLoading(null)
    }
  }

  const workingStaff = staff.filter((s) => isWorking(s.id))
  const offStaff = staff.filter((s) => !isWorking(s.id))

  return (
    <div className="card p-4 mb-4">
      <h2 className="text-sm font-bold text-gray-700 mb-3">
        本日の出勤状況
        <span className="ml-2 text-xs font-normal text-gray-400">
          出勤 {workingStaff.length}名 / 休み {offStaff.length}名
        </span>
      </h2>

      <div className="flex flex-wrap gap-2">
        {staff.map((s, i) => {
          const working = isWorking(s.id)
          const isLoading = loading === s.id

          return (
            <button
              key={s.id}
              onClick={() => toggleAttendance(s.id)}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                working
                  ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                  : 'bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{STAFF_ICONS[i % STAFF_ICONS.length]}</span>
              <span>{s.name}</span>
              {isLoading ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className={`text-xs ${working ? 'text-green-500' : 'text-gray-400'}`}>
                  {working ? '出勤' : '休み'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {offStaff.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          ※ 「休み」のスタッフはお客様の予約画面に表示されません
        </p>
      )}
    </div>
  )
}
