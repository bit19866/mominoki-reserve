'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Staff } from '@/types/database'
import { formatPrice, timeToMinutes, minutesToTime } from '@/lib/utils'

interface ReservationDetail {
  id: string
  staff_id: string
  menu_id: string
  start_time: string
  end_time: string
  customer_name: string | null
  gender: string | null
  notes: string | null
  source: string
  reservation_date: string
}

interface Props {
  reservation: ReservationDetail
  staff: Staff[]
  menus: Menu[]
  businessStart: string
  lastCheckin: string
  slotInterval: number
  onClose: () => void
}

export default function ReservationEditModal({
  reservation, staff, menus,
  businessStart, lastCheckin, slotInterval,
  onClose,
}: Props) {
  const router = useRouter()

  const [form, setForm] = useState({
    staffId:      reservation.staff_id,
    menuId:       reservation.menu_id,
    startTime:    String(reservation.start_time).slice(0, 5),
    customerName: reservation.customer_name || '',
    gender:       (reservation.gender || '') as '' | 'male' | 'female' | 'other',
    notes:        reservation.notes  || '',
    source:       (reservation.source || 'phone') as 'phone' | 'walkin' | 'online',
  })
  const [loading,       setLoading]       = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  // 終了時間を計算
  const selectedMenu = menus.find(m => m.id === form.menuId)
  const endTime = selectedMenu && form.startTime
    ? minutesToTime(timeToMinutes(form.startTime) + selectedMenu.duration_minutes)
    : ''

  // 時間スロット生成
  const timeSlots = (() => {
    const slots = []
    const startM = timeToMinutes(businessStart)
    const endM   = timeToMinutes(lastCheckin)
    for (let m = startM; m <= endM; m += slotInterval) slots.push(minutesToTime(m))
    return slots
  })()

  // メニューをカテゴリーでグループ化
  const menuGroups = menus
    .filter(m => m.duration_minutes > 0 && m.active)
    .reduce<Record<string, Menu[]>>((acc, menu) => {
      const cat = menu.category || 'その他'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(menu)
      return acc
    }, {})

  const handleSave = async () => {
    if (!form.staffId || !form.menuId || !form.startTime || !form.customerName.trim()) {
      setError('スタッフ・コース・時間・お客様名は必須です')
      return
    }
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/admin/reservations/${reservation.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId:      form.staffId,
        menuId:       form.menuId,
        startTime:    form.startTime,
        endTime,
        customerName: form.customerName,
        gender:       form.gender || null,
        notes:        form.notes,
        source:       form.source,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || '更新に失敗しました')
      setLoading(false)
      return
    }
    setLoading(false)
    onClose()
    router.refresh()
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch(`/api/admin/reservations/${reservation.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      setError('削除に失敗しました')
      setDeleting(false)
      return
    }
    setDeleting(false)
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">予約を編集・削除</h2>
            <p className="text-sm text-gray-500">{reservation.reservation_date}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          >✕</button>
        </div>

        <div className="p-6 space-y-5">

          {/* 受付方法（ネット予約以外） */}
          {form.source !== 'online' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">受付方法</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setForm(f => ({ ...f, source: 'phone' }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    form.source === 'phone'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >📞 電話予約</button>
                <button
                  onClick={() => setForm(f => ({ ...f, source: 'walkin' }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    form.source === 'walkin'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >🚶 当日来店</button>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg p-3">
              🌐 ネット予約（受付方法は変更できません）
            </div>
          )}

          {/* スタッフ選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              担当スタッフ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {staff.map(s => (
                <button
                  key={s.id}
                  onClick={() => setForm(f => ({ ...f, staffId: s.id }))}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    form.staffId === s.id
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
                  }`}
                >{s.name}</button>
              ))}
            </div>
          </div>

          {/* コース選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              コース <span className="text-red-500">*</span>
            </label>
            <select
              value={form.menuId}
              onChange={e => setForm(f => ({ ...f, menuId: e.target.value, startTime: '' }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">コースを選択してください</option>
              {Object.entries(menuGroups).map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}（{m.duration_minutes}分・{formatPrice(m.price)}）
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 開始時間 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              開始時間 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto p-1">
              {timeSlots.map(slot => (
                <button
                  key={slot}
                  onClick={() => setForm(f => ({ ...f, startTime: slot }))}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.startTime === slot
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-pink-50 hover:text-pink-600'
                  }`}
                >{slot}</button>
              ))}
            </div>
            {selectedMenu && form.startTime && (
              <div className="mt-2 p-2 bg-pink-50 rounded-lg text-sm text-pink-700 text-center">
                {form.startTime} 〜 {endTime}（{selectedMenu.duration_minutes}分）
              </div>
            )}
          </div>

          {/* お客様名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              お客様名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.customerName}
              onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* 性別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">性別</label>
            <div className="flex gap-2">
              {([
                { value: 'female', label: '👩 女性' },
                { value: 'male',   label: '👨 男性' },
                { value: 'other',  label: '　その他' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, gender: f.gender === value ? '' : value }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    form.gender === value
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* 備考 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">備考</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
            />
          </div>

          {/* エラー */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {/* ボタン */}
          {!confirmDelete ? (
            <div className="space-y-2 pt-2">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm"
                >キャンセル</button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-sm disabled:opacity-60"
                >{loading ? '保存中...' : '変更を保存'}</button>
              </div>
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium transition-colors"
              >🗑️ この予約を削除する</button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <p className="text-sm text-red-700 font-medium text-center">
                本当に削除しますか？この操作は元に戻せません。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-medium"
                >やめる</button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60"
                >{deleting ? '削除中...' : '削除する'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
