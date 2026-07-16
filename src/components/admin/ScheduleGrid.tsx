'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Staff, Reservation, Menu } from '@/types/database'
import { timeToMinutes, minutesToTime } from '@/lib/utils'
import ReservationEditModal from './ReservationEditModal'
import RegisterModal from './RegisterModal'
import ManualReservationModal from './ManualReservationModal'

interface ReservationWithDetails extends Reservation {
  menu: { name: string; duration_minutes: number; price: number } | null
  staff: { name: string } | null
}

interface ShiftInfo {
  isWorking: boolean
  startTime: string
  endTime: string
}

interface Props {
  staff: Staff[]
  menus: Menu[]
  reservations: ReservationWithDetails[]
  businessStart: string
  lastCheckin: string
  slotInterval: number
  targetDate: string
  offStaffIds: string[]
  shiftInfoMap: Record<string, ShiftInfo>
}

const CELL_WIDTH   = 24   // 10分 = 24px（60分 = 144px）
const CELL_HEIGHT  = 60
const HEADER_WIDTH = 100

const AVATAR_COLORS = [
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef9c3', text: '#854d0e' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#ffedd5', text: '#9a3412' },
  { bg: '#cffafe', text: '#155e75' },
  { bg: '#d1fae5', text: '#065f46' },
]

const BLOCK_COLORS = [
  { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d', badge: '#fdf2f8' },
  { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', badge: '#eff6ff' },
  { bg: '#dcfce7', border: '#86efac', text: '#166534', badge: '#f0fdf4' },
  { bg: '#fef9c3', border: '#fde047', text: '#854d0e', badge: '#fefce8' },
  { bg: '#ede9fe', border: '#c4b5fd', text: '#5b21b6', badge: '#f5f3ff' },
  { bg: '#ffedd5', border: '#fdba74', text: '#9a3412', badge: '#fff7ed' },
  { bg: '#cffafe', border: '#67e8f9', text: '#155e75', badge: '#ecfeff' },
  { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46', badge: '#f0fdfa' },
]

function generateTimeLabels(start: string, end: string, interval: number): string[] {
  const labels: string[] = []
  const startM = timeToMinutes(start)
  const endM   = timeToMinutes(end)
  for (let m = startM; m <= endM; m += interval) {
    labels.push(minutesToTime(m))
  }
  return labels
}

interface ShiftEditTarget {
  staffId: string
  staffName: string
  isWorking: boolean
  startTime: string
  endTime: string
}

function ShiftDayEditModal({
  target, targetDate, businessStart, lastCheckin, onClose, onSaved,
}: {
  target: ShiftEditTarget
  targetDate: string
  businessStart: string
  lastCheckin: string
  onClose: () => void
  onSaved: () => void
}) {
  const [isWorking, setIsWorking] = useState(target.isWorking)
  const [startTime, setStartTime] = useState(target.startTime)
  const [endTime,   setEndTime]   = useState(target.endTime)
  const [saving,    setSaving]    = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/shift-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:         'override',
        staffId:      target.staffId,
        overrideDate: targetDate,
        isWorking,
        startTime:    isWorking ? startTime : null,
        endTime:      isWorking ? endTime   : null,
      }),
    })
    setSaving(false)
    onSaved()
  }

  const d = new Date(targetDate)
  const DOW = ['日','月','火','水','木','金','土']
  const dateLabel = `${d.getMonth()+1}月${d.getDate()}日（${DOW[d.getDay()]}）`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">{target.staffName} さん</h3>
            <p className="text-sm text-gray-500">{dateLabel} のシフト変更</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        {/* 出勤・休みボタン */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setIsWorking(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
              isWorking ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            出勤
          </button>
          <button
            onClick={() => setIsWorking(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
              !isWorking ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            休み
          </button>
        </div>

        {/* 時間設定 */}
        {isWorking && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">開始</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <span className="text-gray-400 mt-5">〜</span>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">終了</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200">
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-bold hover:bg-pink-700 disabled:opacity-60"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface PaymentDetail {
  total_amount: number
  base_price: number
  payment_method: string
  options: Array<{ name: string; price: number }>
  nomination_type: string | null
  discount: number
  cash_received: number | null
  change_amount: number | null
  notes: string | null
  staff_name: string | null
  menu_name: string | null
  customer_name: string | null
}

const PAY_LABELS: Record<string, string> = {
  cash: '現金', card: 'カード', paypay: 'PayPay', rakuten_pay: '楽天ペイ',
}

function PaymentDetailModal({ payment, loading, onClose }: {
  payment: PaymentDetail | null
  loading: boolean
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-80 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gray-950 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 tracking-widest uppercase mb-0.5">会計詳細</p>
            <p className="font-bold text-lg">{payment?.customer_name || '匿名'} 様</p>
            <p className="text-xs text-gray-400 mt-0.5">{payment?.staff_name} · {payment?.menu_name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white"
          >✕</button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>
          ) : payment ? (
            <div className="space-y-3">
              {/* 合計 */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between border border-gray-100">
                <span className="text-sm text-gray-500">合計（税込）</span>
                <span className="text-2xl font-bold text-gray-900 tabular-nums">
                  ¥{payment.total_amount.toLocaleString()}
                </span>
              </div>

              {/* 内訳 */}
              <div className="space-y-1.5 text-sm px-1">
                <div className="flex justify-between text-gray-600">
                  <span>基本料金</span>
                  <span>¥{payment.base_price.toLocaleString()}</span>
                </div>
                {payment.nomination_type && (
                  <div className="flex justify-between text-pink-600">
                    <span>{payment.nomination_type}料</span>
                    <span>+¥1,650</span>
                  </div>
                )}
                {(payment.options || []).map((o, i) => (
                  <div key={i} className="flex justify-between text-indigo-600">
                    <span>{o.name}</span>
                    <span>+¥{o.price.toLocaleString()}</span>
                  </div>
                ))}
                {payment.discount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>割引</span>
                    <span>−¥{payment.discount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* 支払い情報 */}
              <div className="border-t border-gray-100 pt-2.5 space-y-1.5 text-sm px-1">
                <div className="flex justify-between text-gray-600">
                  <span>支払い方法</span>
                  <span className="font-semibold">{PAY_LABELS[payment.payment_method] || payment.payment_method}</span>
                </div>
                {payment.cash_received != null && (
                  <div className="flex justify-between text-gray-600">
                    <span>お預かり</span>
                    <span>¥{payment.cash_received.toLocaleString()}</span>
                  </div>
                )}
                {payment.change_amount != null && payment.change_amount > 0 && (
                  <div className="flex justify-between text-green-700 font-semibold">
                    <span>お釣り</span>
                    <span>¥{payment.change_amount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {payment.notes && (
                <div className="bg-yellow-50 rounded-lg px-3 py-2 text-xs text-yellow-800 border border-yellow-100">
                  メモ: {payment.notes}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">会計データが見つかりません</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ScheduleGrid({
  staff, menus, reservations,
  businessStart, lastCheckin, slotInterval,
  targetDate, offStaffIds, shiftInfoMap,
}: Props) {
  const router = useRouter()
  const [editTarget,      setEditTarget]      = useState<ReservationWithDetails | null>(null)
  const [registerTarget,  setRegisterTarget]  = useState<ReservationWithDetails | null>(null)
  const [addTarget,       setAddTarget]       = useState<{ staffId: string; startTime: string } | null>(null)
  const [shiftEditTarget, setShiftEditTarget] = useState<ShiftEditTarget | null>(null)
  const [paymentDetail,   setPaymentDetail]   = useState<PaymentDetail | null>(null)
  const [paymentLoading,  setPaymentLoading]  = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const handleViewPayment = async (reservationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPaymentDetail(null)
    setPaymentLoading(true)
    setShowPaymentModal(true)
    const res = await fetch(`/api/admin/payments?reservation_id=${reservationId}`)
    const json = await res.json()
    setPaymentDetail(Array.isArray(json) ? json[0] || null : null)
    setPaymentLoading(false)
  }

  const optionMenus  = menus.filter(m => m.category === 'オプション' && m.active)
  const timeLabels   = generateTimeLabels(businessStart, lastCheckin, slotInterval)
  const startMinutes = timeToMinutes(businessStart)
  const totalSlots   = timeLabels.length
  const offSet       = new Set(offStaffIds)
  const workingStaff = staff.filter(s => !offSet.has(s.id))
  const offStaff     = staff.filter(s => offSet.has(s.id))

  const getReservationForStaff = (staffId: string) =>
    reservations.filter(r => r.staff_id === staffId)

  const renderStaffRow = (s: Staff, isOff: boolean) => {
    const staffReservations = getReservationForStaff(s.id)
    const staffIndex  = staff.indexOf(s)
    const avatarColor = AVATAR_COLORS[staffIndex % AVATAR_COLORS.length]
    const blockColor  = BLOCK_COLORS[staffIndex % BLOCK_COLORS.length]
    const shift       = shiftInfoMap[s.id] || { isWorking: !isOff, startTime: businessStart, endTime: lastCheckin }
    const shiftStartM = timeToMinutes(shift.startTime)
    const shiftEndM   = timeToMinutes(shift.endTime)
    const shiftLeft   = ((shiftStartM - startMinutes) / slotInterval) * CELL_WIDTH
    const shiftWidth  = ((shiftEndM - shiftStartM) / slotInterval) * CELL_WIDTH

    // グリッドをクリックして手動予約追加
    const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isOff || !shift.isWorking) return
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickedMinutes = Math.floor(clickX / CELL_WIDTH) * slotInterval + startMinutes
      const h = Math.floor(clickedMinutes / 60)
      const m = clickedMinutes % 60
      const startTime = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      setAddTarget({ staffId: s.id, startTime })
    }

    // 行ごとの左ボーダー色（スタッフ識別）
    const rowAccentColors = [
      '#f87171', '#60a5fa', '#34d399', '#fbbf24',
      '#a78bfa', '#fb923c', '#22d3ee', '#f472b6',
    ]
    const accentColor = rowAccentColors[staffIndex % rowAccentColors.length]

    return (
      <div key={s.id} className="flex relative" style={{ height: CELL_HEIGHT, borderBottom: '2px solid #e5e7eb' }}>

        {/* スタッフ情報列（横スクロール時に固定） */}
        <div
          className="shrink-0 flex items-center gap-2 px-2 border-r border-gray-200"
          style={{
            width: HEADER_WIDTH,
            backgroundColor: isOff ? '#f9fafb' : 'white',
            position: 'sticky',
            left: 0,
            zIndex: 20,
            borderLeft: `4px solid ${isOff ? '#e5e7eb' : accentColor}`,
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold leading-tight truncate" style={{ color: isOff ? '#9ca3af' : '#111827' }}>
              {s.name}
            </div>
            {!isOff && shift.isWorking && (
              <button
                onClick={() => setShiftEditTarget({
                  staffId: s.id, staffName: s.name,
                  isWorking: true,
                  startTime: shift.startTime, endTime: shift.endTime,
                })}
                className="text-[10px] text-green-600 leading-tight mt-0.5 block hover:underline"
              >
                {shift.startTime}〜{shift.endTime}
              </button>
            )}
            {(isOff || !shift.isWorking) && (
              <button
                onClick={() => setShiftEditTarget({
                  staffId: s.id, staffName: s.name,
                  isWorking: false,
                  startTime: businessStart, endTime: lastCheckin,
                })}
                className="text-[10px] text-blue-500 underline leading-tight mt-0.5 block hover:text-blue-700"
              >
                休み・変更
              </button>
            )}
          </div>
        </div>

        {/* グリッドエリア */}
        <div
          className="relative flex-1 overflow-hidden"
          onClick={handleGridClick}
          style={{ cursor: isOff || !shift.isWorking ? 'default' : 'pointer' }}
          title={isOff || !shift.isWorking ? '' : 'クリックして予約を追加'}
        >
          {/* 勤務外背景（斜線） */}
          <div className="absolute inset-0" style={{
            backgroundColor: '#f9fafb',
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(156,163,175,0.2) 4px, rgba(156,163,175,0.2) 5px)',
          }} />

          {/* 出勤時間帯 */}
          {!isOff && shift.isWorking && (
            <div className="absolute top-0 bottom-0" style={{
              left: Math.max(0, shiftLeft),
              width: shiftWidth,
              backgroundColor: '#f0fdf4',
              borderLeft: '2px solid #86efac',
              borderRight: '2px solid #86efac',
            }} />
          )}

          {/* グリッド線 */}
          {timeLabels.map((time, i) => (
            <div key={time} className="absolute top-0 bottom-0" style={{
              left: i * CELL_WIDTH,
              borderLeft: `1px solid ${
                time.endsWith(':00') ? '#9ca3af' :
                time.endsWith(':30') ? '#d1d5db' :
                '#e5e7eb'
              }`,
            }} />
          ))}

          {/* 休みオーバーレイ */}
          {(isOff || !shift.isWorking) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-200/50">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white text-gray-400 border border-gray-200">
                本日休み
              </span>
            </div>
          )}

          {/* 予約ブロック（休みスタッフでも表示し会計できるようにする） */}
          {staffReservations.map((r) => {
            const rStart     = timeToMinutes(String(r.start_time).slice(0, 5))
            const rEnd       = timeToMinutes(String(r.end_time).slice(0, 5))
            const leftPos    = ((rStart - startMinutes) / slotInterval) * CELL_WIDTH
            const blockWidth = ((rEnd - rStart) / slotInterval) * CELL_WIDTH - 3
            const isCompleted = r.status === 'completed'
            const color = isCompleted
              ? { bg: '#f3f4f6', border: '#d1d5db', text: '#6b7280', badge: '#e5e7eb' }
              : blockColor

            return (
              <div
                key={r.id}
                onClick={(e) => { e.stopPropagation(); setEditTarget(r) }}
                className="absolute z-20 cursor-pointer transition-all hover:brightness-95"
                style={{
                  left: leftPos + 2, top: 4, bottom: 4,
                  width: Math.max(blockWidth, 44),
                  backgroundColor: color.bg,
                  border: `1.5px solid ${color.border}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <div className="h-full flex items-center px-2 py-1 gap-2">
                  {/* テキスト情報 */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="font-bold leading-tight truncate" style={{ fontSize: 11, color: color.text }}>
                      {r.customer_name || '匿名'}
                    </p>
                    <p className="leading-tight truncate mt-0.5" style={{ fontSize: 10, color: color.text, opacity: 0.75 }}>
                      {r.menu?.name}
                    </p>
                    <p className="leading-tight mt-0.5" style={{ fontSize: 9, color: color.text, opacity: 0.55 }}>
                      {String(r.start_time).slice(0, 5)}〜{String(r.end_time).slice(0, 5)}
                    </p>
                  </div>

                  {/* 会計ボタン or 済バッジ */}
                  {!isCompleted ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setRegisterTarget(r) }}
                      className="shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-md font-bold transition-all hover:opacity-80 active:scale-95 z-30"
                      style={{ backgroundColor: '#16a34a', color: 'white', width: 30, height: 36, fontSize: 8, padding: '3px 2px', lineHeight: 1.2 }}
                      title="会計する"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                      会計
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleViewPayment(r.id, e)}
                      className="shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-md font-bold transition-all hover:brightness-90 active:scale-95 z-30"
                      style={{ backgroundColor: '#e5e7eb', color: '#6b7280', width: 30, height: 36, fontSize: 9 }}
                      title="会計詳細を確認"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      済
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      {showPaymentModal && (
        <PaymentDetailModal
          payment={paymentDetail}
          loading={paymentLoading}
          onClose={() => { setShowPaymentModal(false); setPaymentDetail(null); setPaymentLoading(false) }}
        />
      )}
      {shiftEditTarget && (
        <ShiftDayEditModal
          target={shiftEditTarget}
          targetDate={targetDate}
          businessStart={businessStart}
          lastCheckin={lastCheckin}
          onClose={() => setShiftEditTarget(null)}
          onSaved={() => { setShiftEditTarget(null); router.refresh() }}
        />
      )}
      {addTarget && (
        <ManualReservationModal
          staff={staff}
          menus={menus}
          targetDate={targetDate}
          businessStart={businessStart}
          lastCheckin={lastCheckin}
          slotInterval={slotInterval}
          initialStaffId={addTarget.staffId}
          initialStartTime={addTarget.startTime}
          onClose={() => setAddTarget(null)}
        />
      )}
      {registerTarget && (
        <RegisterModal
          reservation={{
            id: registerTarget.id, customer_name: registerTarget.customer_name,
            staff: registerTarget.staff, menu: registerTarget.menu,
            reservation_date: registerTarget.reservation_date,
            start_time: String(registerTarget.start_time), end_time: String(registerTarget.end_time),
            staff_id: registerTarget.staff_id, menu_id: registerTarget.menu_id,
          }}
          optionMenus={optionMenus}
          onClose={() => setRegisterTarget(null)}
          onComplete={() => { setRegisterTarget(null); window.location.reload() }}
        />
      )}
      {editTarget && (
        <ReservationEditModal
          reservation={{
            id: editTarget.id, staff_id: editTarget.staff_id, menu_id: editTarget.menu_id,
            start_time: String(editTarget.start_time), end_time: String(editTarget.end_time),
            customer_name: editTarget.customer_name, gender: (editTarget as any).gender ?? null,
            notes: editTarget.notes, source: (editTarget as any).source ?? 'phone',
            reservation_date: editTarget.reservation_date,
          }}
          staff={staff} menus={menus}
          businessStart={businessStart} lastCheckin={lastCheckin} slotInterval={slotInterval}
          onClose={() => setEditTarget(null)}
          onRegister={editTarget.status !== 'completed' ? () => { setRegisterTarget(editTarget); setEditTarget(null) } : undefined}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div style={{ minWidth: HEADER_WIDTH + CELL_WIDTH * totalSlots + 'px' }}>

            {/* 時間ヘッダー */}
            <div className="flex sticky top-0 z-30 bg-gray-800">
              <div className="shrink-0 flex items-center justify-center border-r border-gray-700 bg-gray-800"
                style={{ width: HEADER_WIDTH, height: 44, position: 'sticky', left: 0, zIndex: 40 }}>
                <span className="text-xs font-medium text-gray-400">スタッフ</span>
              </div>
              {timeLabels.map((time) => (
                <div key={time} className="shrink-0 flex flex-col items-center justify-end pb-1"
                  style={{
                    width: CELL_WIDTH, height: 44,
                    borderRight: `1px solid ${time.endsWith(':00') ? '#374151' : '#1f2937'}`,
                  }}>
                  {time.endsWith(':00') ? (
                    <>
                      <span className="w-px h-2 bg-gray-400 block mb-0.5" />
                      <span className="text-[10px] font-bold text-white leading-none">{time.slice(0,2)}</span>
                    </>
                  ) : time.endsWith(':30') ? (
                    <>
                      <span className="w-px h-1.5 bg-gray-500 block mb-0.5" />
                      <span className="text-[9px] text-gray-500 leading-none">30</span>
                    </>
                  ) : (
                    <span className="w-px h-1 bg-gray-600 block" />
                  )}
                </div>
              ))}
            </div>

            {/* 出勤スタッフ */}
            <div className="bg-white">
              {workingStaff.map(s => renderStaffRow(s, false))}
            </div>

            {/* 区切り */}
            {offStaff.length > 0 && workingStaff.length > 0 && (
              <div className="flex items-center bg-gray-50 border-y border-dashed border-gray-200" style={{ height: 28 }}>
                <div className="shrink-0 flex items-center justify-center border-r border-gray-200 bg-gray-50"
                  style={{ width: HEADER_WIDTH, position: 'sticky', left: 0, zIndex: 20 }}>
                  <span className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase">休み</span>
                </div>
                <div className="flex-1" />
              </div>
            )}

            {/* 休みスタッフ */}
            <div className="bg-gray-50">
              {offStaff.map(s => renderStaffRow(s, true))}
            </div>

          </div>
        </div>

        {/* 凡例 */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }} />
            <span>出勤時間帯</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{
              backgroundColor: '#f9fafb',
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(156,163,175,0.3) 2px, rgba(156,163,175,0.3) 3px)',
            }} />
            <span>勤務外</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-pink-100 border border-pink-300" />
            <span>予約あり</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
            <span>会計済み</span>
          </div>
          <span className="ml-auto hidden md:block text-gray-400">← スクロールで全時間帯を確認 ／ 予約ブロックをクリックで編集</span>
        </div>
      </div>
    </>
  )
}
