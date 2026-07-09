'use client'

import { useState } from 'react'
import { Staff } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import WeeklyScheduleEditor from './WeeklyScheduleEditor'

const STAFF_ICONS = ['🌸', '🌿', '🍀', '🌺', '🌻', '🌼', '🌷', '🌹', '🪷']

interface Props {
  initialStaff: Staff[]
  defaultStart: string
  defaultEnd: string
}

export default function StaffManager({ initialStaff, defaultStart, defaultEnd }: Props) {
  const [staff, setStaff] = useState(initialStaff)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [openShiftId, setOpenShiftId] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleAdd = async () => {
    if (!newName.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .from('staff')
      .insert({ name: newName.trim(), sort_order: staff.length + 1 })
      .select()
      .single()
    if (!error && data) {
      setStaff((prev) => [...prev, data])
      setNewName('')
    }
    setLoading(false)
    router.refresh()
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from('staff').update({ active }).eq('id', id)
    if (!error) {
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, active } : s)))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このスタッフを削除しますか？\n（既存の予約データが残る可能性があります）')) return
    const { error } = await supabase.from('staff').delete().eq('id', id)
    if (!error) {
      setStaff((prev) => prev.filter((s) => s.id !== id))
    }
  }

  const handleRename = async (id: string, name: string) => {
    const { error } = await supabase.from('staff').update({ name }).eq('id', id)
    if (!error) {
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)))
    }
  }

  return (
    <div className="max-w-2xl">
      {/* スタッフ一覧 */}
      <div className="card overflow-hidden mb-6">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-700">
            登録スタッフ（{staff.length}名）
          </p>
        </div>
        <ul className="divide-y divide-gray-100">
          {staff.map((s, i) => (
            <li key={s.id}>
              {/* スタッフ行 */}
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <span className="text-2xl">{STAFF_ICONS[i % STAFF_ICONS.length]}</span>

                {editingId === s.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { handleRename(s.id, editName); setEditingId(null) }
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 font-medium text-gray-900">{s.name}</span>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  {/* 勤務状態 */}
                  <button
                    onClick={() => handleToggleActive(s.id, !s.active)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {s.active ? '在籍中' : '休止'}
                  </button>

                  {/* シフト設定ボタン */}
                  <button
                    onClick={() => setOpenShiftId(openShiftId === s.id ? null : s.id)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors ${
                      openShiftId === s.id
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'border-gray-200 text-gray-500 hover:border-pink-300 hover:text-pink-600'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 inline mr-1 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    シフト
                  </button>

                  {editingId === s.id ? (
                    <>
                      <button
                        onClick={() => { handleRename(s.id, editName); setEditingId(null) }}
                        className="text-xs text-green-600 hover:underline"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-400 hover:underline"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditingId(s.id); setEditName(s.name) }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        名前変更
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        削除
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 週間シフトエディタ（開いているときだけ表示） */}
              {openShiftId === s.id && (
                <div className="px-4 pb-4">
                  <WeeklyScheduleEditor
                    staff={s}
                    defaultStart={defaultStart}
                    defaultEnd={defaultEnd}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* スタッフ追加 */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">スタッフを追加</h3>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="スタッフ名（例：田中）"
            className="input-field text-sm flex-1"
          />
          <button
            onClick={handleAdd}
            disabled={loading || !newName.trim()}
            className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  )
}
