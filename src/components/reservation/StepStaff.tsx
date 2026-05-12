'use client'

import { useEffect, useState } from 'react'
import { Staff } from '@/types/database'

interface Props {
  staff: Staff[]
  selected: Staff | null
  onSelect: (staff: Staff | null) => void
  onBack: () => void
  date: string
}

const STAFF_ICONS = ['🌸', '🌿', '🍀', '🌺', '🌻', '🌼', '🌷', '🌹', '🪷']

export default function StepStaff({ staff, selected, onSelect, onBack, date }: Props) {
  const [offStaffIds, setOffStaffIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await fetch(`/api/staff-attendance?date=${date}`)
        const data = await res.json()
        setOffStaffIds(new Set(data.offStaffIds || []))
      } finally {
        setLoading(false)
      }
    }
    fetchAttendance()
  }, [date])

  const workingStaff = staff.filter((s) => !offStaffIds.has(s.id))
  const offStaff = staff.filter((s) => offStaffIds.has(s.id))

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">スタッフを選択</h2>
      <p className="text-sm text-gray-500 mb-6">
        ご希望のスタッフをお選びください（指名料：¥1,650）
      </p>

      {/* 指名なし */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full card p-4 text-left mb-3 transition-all hover:shadow-md ${
          selected === null
            ? 'border-pink-500 ring-2 ring-pink-200'
            : 'hover:border-pink-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
            🎲
          </div>
          <div>
            <p className="font-medium text-gray-900">指名なし（おまかせ）</p>
            <p className="text-xs text-gray-400">指名料なし・出勤中のスタッフが担当</p>
          </div>
          {selected === null && (
            <div className="ml-auto w-5 h-5 bg-pink-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
        </div>
      </button>

      {/* 出勤中スタッフ */}
      {workingStaff.length > 0 && (
        <>
          <p className="text-xs font-medium text-gray-500 mb-2 mt-4">
            出勤中（{workingStaff.length}名）
          </p>
          <div className="grid grid-cols-2 gap-2">
            {workingStaff.map((s) => {
              const i = staff.indexOf(s)
              return (
                <button
                  key={s.id}
                  onClick={() => onSelect(s)}
                  className={`card p-4 text-center transition-all hover:shadow-md ${
                    selected?.id === s.id
                      ? 'border-pink-500 ring-2 ring-pink-200'
                      : 'hover:border-pink-200'
                  }`}
                >
                  <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center text-2xl mx-auto mb-2">
                    {STAFF_ICONS[i % STAFF_ICONS.length]}
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">指名料 ¥1,650</p>
                  {selected?.id === s.id && (
                    <div className="mt-1 text-xs text-pink-600 font-medium">選択中</div>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* 休みスタッフ（表示のみ・選択不可） */}
      {offStaff.length > 0 && (
        <>
          <p className="text-xs font-medium text-gray-400 mb-2 mt-5">
            本日休み（予約不可）
          </p>
          <div className="grid grid-cols-2 gap-2 opacity-40">
            {offStaff.map((s) => {
              const i = staff.indexOf(s)
              return (
                <div
                  key={s.id}
                  className="card p-4 text-center cursor-not-allowed bg-gray-50"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-2">
                    {STAFF_ICONS[i % STAFF_ICONS.length]}
                  </div>
                  <p className="font-medium text-gray-500 text-sm">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">本日休み</p>
                </div>
              )
            })}
          </div>
        </>
      )}

      <button onClick={onBack} className="mt-6 btn-secondary w-full">
        戻る
      </button>
    </div>
  )
}
