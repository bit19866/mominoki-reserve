'use client'

import { useState, useEffect } from 'react'
import { Staff } from '@/types/database'

interface Props {
  staff: Staff[]
  targetDate: string
  defaultStart: string
  defaultEnd: string
}

interface StaffShift {
  staffId: string
  staffName: string
  isWorking: boolean
  startTime: string
  endTime: string
  source: string
}

const SOURCE_LABELS: Record<string, string> = {
  override: '個別設定',
  day_off: '休み設定',
  weekly: '週間シフト',
  default: 'デフォルト',
}

export default function ShiftOverridePanel({ staff, targetDate, defaultStart, defaultEnd }: Props) {
  const [shifts, setShifts] = useState<StaffShift[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ isWorking: true, startTime: '', endTime: '' })
  const [saving, setSaving] = useState(false)

  const fetchShifts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/shift-hours?date=${targetDate}`)
      const data = await res.json()
      setShifts(data.shiftInfo || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShifts()
  }, [targetDate])

  const startEdit = (shift: StaffShift) => {
    setEditingId(shift.staffId)
    setEditForm({
      isWorking: shift.isWorking,
      startTime: shift.startTime,
      endTime: shift.endTime,
    })
  }

  const handleSave = async (staffId: string) => {
    setSaving(true)
    await fetch('/api/shift-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'override',
        staffId,
        overrideDate: targetDate,
        isWorking: editForm.isWorking,
        startTime: editForm.isWorking ? editForm.startTime : null,
        endTime: editForm.isWorking ? editForm.endTime : null,
      }),
    })
    setSaving(false)
    setEditingId(null)
    await fetchShifts()
  }

  const handleReset = async (staffId: string) => {
    await fetch('/api/shift-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'override',
        staffId,
        overrideDate: targetDate,
        isWorking: null,
      }),
    })
    setEditingId(null)
    await fetchShifts()
  }

  if (loading) {
    return (
      <div className="card p-4 mb-4 flex justify-center">
        <div className="w-5 h-5 border-2 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="card mb-4 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-700">本日のシフト時間</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            「変更」でこの日だけ個別に上書きできます
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {shifts.map((shift) => (
          <div key={shift.staffId} className="px-4 py-3">
            {editingId === shift.staffId ? (
              /* 編集モード */
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 w-16">{shift.staffName}</span>
                  <button
                    onClick={() => setEditForm((f) => ({ ...f, isWorking: !f.isWorking }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      editForm.isWorking
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {editForm.isWorking ? '出勤' : '休み'}
                  </button>
                </div>
                {editForm.isWorking && (
                  <div className="flex items-center gap-2 ml-16">
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="border border-gray-200 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-pink-400"
                    />
                    <span className="text-gray-400 text-xs">〜</span>
                    <input
                      type="time"
                      value={editForm.endTime}
                      onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="border border-gray-200 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-pink-400"
                    />
                  </div>
                )}
                <div className="flex gap-2 ml-16">
                  <button
                    onClick={() => handleSave(shift.staffId)}
                    disabled={saving}
                    className="text-xs bg-pink-600 hover:bg-pink-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={() => handleReset(shift.staffId)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg"
                  >
                    デフォルトに戻す
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              /* 表示モード */
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm text-gray-900 w-16 shrink-0">
                  {shift.staffName}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    shift.isWorking
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {shift.isWorking ? '出勤' : '休み'}
                </span>
                {shift.isWorking && (
                  <span className="text-sm text-gray-600">
                    {shift.startTime}〜{shift.endTime}
                  </span>
                )}
                <span className="text-xs text-gray-300 ml-1">
                  ({SOURCE_LABELS[shift.source] || shift.source})
                </span>
                <button
                  onClick={() => startEdit(shift)}
                  className="ml-auto text-xs text-blue-600 hover:underline shrink-0"
                >
                  変更
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
