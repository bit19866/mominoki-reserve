'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Staff } from '@/types/database'
import { formatPrice, timeToMinutes, minutesToTime } from '@/lib/utils'

interface Props {
  staff: Staff[]
  menus: Menu[]
  targetDate: string
  businessStart: string
  lastCheckin: string
  slotInterval: number
  onClose: () => void
  initialStaffId?: string
  initialStartTime?: string
}

export default function ManualReservationModal({
  staff, menus, targetDate,
  businessStart, lastCheckin, slotInterval,
  onClose, initialStaffId, initialStartTime,
}: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    staffId:       initialStaffId || '',
    menuId:        '',
    startTime:     initialStartTime || '',
    customerName:  '',
    gender:        '' as '' | 'male' | 'female' | 'other',
    notes:         '',
    source:        'phone' as 'phone' | 'walkin',
    isNewCustomer: null as null | boolean,
    ageGroup:      '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 選択中のメニュー
  const selectedMenu = menus.find((m) => m.id === form.menuId)

  // 終了時間を計算
  const endTime = selectedMenu && form.startTime
    ? (() => {
        const startM = timeToMinutes(form.startTime)
        return minutesToTime(startM + selectedMenu.duration_minutes)
      })()
    : ''

  // 時間スロット生成
  const timeSlots = (() => {
    const slots = []
    const startM = timeToMinutes(businessStart)
    const endM = timeToMinutes(lastCheckin)
    for (let m = startM; m <= endM; m += slotInterval) {
      slots.push(minutesToTime(m))
    }
    return slots
  })()

  // メニューをカテゴリーでグループ化（オプション除外）
  const menuGroups = menus
    .filter((m) => m.duration_minutes > 0 && m.active)
    .reduce<Record<string, Menu[]>>((acc, menu) => {
      const cat = menu.category || 'その他'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(menu)
      return acc
    }, {})

  const handleSubmit = async () => {
    if (!form.staffId || !form.menuId || !form.startTime || !form.customerName.trim()) {
      setError('スタッフ・コース・時間・お客様名は必須です')
      return
    }

    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId:         form.staffId,
        menuId:          form.menuId,
        reservationDate: targetDate,
        startTime:       form.startTime,
        endTime,
        customerName:    form.customerName,
        gender:          form.gender || null,
        notes:           form.notes,
        source:          form.source,
        isNewCustomer:   form.isNewCustomer,
        ageGroup:        form.ageGroup || null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || '予約の作成に失敗しました')
      setLoading(false)
      return
    }

    setLoading(false)
    onClose()
    router.refresh()
  }

  const formatDateJa = (dateStr: string) => {
    const d = new Date(dateStr)
    const weekdays = ['日', '月', '火', '水', '木', '金', '土']
    return `${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">手動予約入力</h2>
            <p className="text-sm text-gray-500">{formatDateJa(targetDate)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* 受付方法 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">受付方法</label>
            <div className="flex gap-2">
              <button
                onClick={() => setForm((f) => ({ ...f, source: 'phone' }))}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  form.source === 'phone'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📞 電話予約
              </button>
              <button
                onClick={() => setForm((f) => ({ ...f, source: 'walkin' }))}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  form.source === 'walkin'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🚶 当日来店
              </button>
            </div>
          </div>

          {/* スタッフ選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              担当スタッフ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {staff.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setForm((f) => ({ ...f, staffId: s.id }))}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    form.staffId === s.id
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300'
                  }`}
                >
                  {s.name}
                </button>
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
              onChange={(e) => setForm((f) => ({ ...f, menuId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">コースを選択してください</option>
              {Object.entries(menuGroups).map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items.map((m) => (
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
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setForm((f) => ({ ...f, startTime: slot }))}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.startTime === slot
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-pink-50 hover:text-pink-600'
                  }`}
                >
                  {slot}
                </button>
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
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              placeholder="山田 花子"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* 性別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">性別</label>
            <div className="flex gap-2">
              {[
                { value: 'female', label: '👩 女性' },
                { value: 'male',   label: '👨 男性' },
                { value: 'other',  label: '　その他' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, gender: f.gender === value ? '' : value as typeof f.gender }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    form.gender === value
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 新規 / リピーター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">新規 / リピーター</label>
            <div className="flex gap-2">
              {([
                { value: true,  label: '新規',      color: 'bg-blue-600'  },
                { value: false, label: 'リピーター', color: 'bg-green-600' },
              ] as const).map(({ value, label, color }) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isNewCustomer: f.isNewCustomer === value ? null : value }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    form.isNewCustomer === value
                      ? `${color} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 年代 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">年代</label>
            <div className="grid grid-cols-3 gap-2">
              {['10代', '20代', '30代', '40代', '50代', '60代以上'].map(group => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, ageGroup: f.ageGroup === group ? '' : group }))}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.ageGroup === group
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          {/* 備考 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">備考</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="初回・アレルギーあり など"
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
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
            >
              {loading ? '登録中...' : '予約を登録する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
