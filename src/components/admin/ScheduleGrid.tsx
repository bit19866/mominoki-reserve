'use client'

import { useState } from 'react'
import { Staff, Reservation, Menu } from '@/types/database'
import { timeToMinutes, minutesToTime } from '@/lib/utils'
import ReservationEditModal from './ReservationEditModal'

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

const CELL_WIDTH = 80
const CELL_HEIGHT = 64
const HEADER_WIDTH = 80

function generateTimeLabels(start: string, end: string, interval: number): string[] {
  const labels: string[] = []
  const startM = timeToMinutes(start)
  const endM = timeToMinutes(end)
  for (let m = startM; m <= endM; m += interval) {
    labels.push(minutesToTime(m))
  }
  return labels
}

const RESERVATION_COLORS = [
  'bg-pink-200 border-pink-400 text-pink-900',
  'bg-purple-200 border-purple-400 text-purple-900',
  'bg-blue-200 border-blue-400 text-blue-900',
  'bg-green-200 border-green-400 text-green-900',
  'bg-yellow-200 border-yellow-400 text-yellow-900',
  'bg-orange-200 border-orange-400 text-orange-900',
  'bg-teal-200 border-teal-400 text-teal-900',
  'bg-indigo-200 border-indigo-400 text-indigo-900',
  'bg-rose-200 border-rose-400 text-rose-900',
]

export default function ScheduleGrid({
  staff,
  menus,
  reservations,
  businessStart,
  lastCheckin,
  slotInterval,
  targetDate,
  offStaffIds,
  shiftInfoMap,
}: Props) {
  const [editTarget, setEditTarget] = useState<ReservationWithDetails | null>(null)

  const timeLabels = generateTimeLabels(businessStart, lastCheckin, slotInterval)
  const startMinutes = timeToMinutes(businessStart)
  const totalSlots = timeLabels.length
  const offSet = new Set(offStaffIds)

  const workingStaff = staff.filter((s) => !offSet.has(s.id))
  const offStaff = staff.filter((s) => offSet.has(s.id))

  const getReservationForStaff = (staffId: string) =>
    reservations.filter((r) => r.staff_id === staffId)

  const renderStaffRow = (s: Staff, isOff: boolean) => {
    const staffReservations = getReservationForStaff(s.id)
    const colorClass = RESERVATION_COLORS[staff.indexOf(s) % RESERVATION_COLORS.length]
    const shift = shiftInfoMap[s.id] || { isWorking: !isOff, startTime: businessStart, endTime: lastCheckin }

    // シフト開始・終了位置（px）
    const shiftStartM = timeToMinutes(shift.startTime)
    const shiftEndM = timeToMinutes(shift.endTime)
    const shiftLeft = ((shiftStartM - startMinutes) / slotInterval) * CELL_WIDTH
    const shiftWidth = ((shiftEndM - shiftStartM) / slotInterval) * CELL_WIDTH

    return (
      <div
        key={s.id}
        className="flex border-b border-gray-200 relative"
        style={{ height: CELL_HEIGHT }}
      >
        {/* スタッフ名 */}
        <div
          className={`shrink-0 flex flex-col items-center justify-center border-r border-gray-200 z-10 ${
            isOff ? 'bg-gray-50' : 'bg-white'
          }`}
          style={{ width: HEADER_WIDTH, height: CELL_HEIGHT }}
        >
          <span className={`text-xs font-bold ${isOff ? 'text-gray-400' : 'text-gray-800'}`}>
            {s.name}
          </span>
          {!isOff && shift.isWorking && (
            <span className="text-xs text-green-600 mt-0.5">
              {shift.startTime}〜{shift.endTime}
            </span>
          )}
          {isOff && (
            <span className="text-xs text-red-400 mt-0.5">休み</span>
          )}
          {!isOff && !shift.isWorking && (
            <span className="text-xs text-gray-400 mt-0.5">休み</span>
          )}
        </div>

        {/* グリッドエリア */}
        <div className="relative flex-1 overflow-hidden">
          {/* 全体の背景（勤務外：斜線パターン） */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: '#f1f5f9',
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(148,163,184,0.3) 4px, rgba(148,163,184,0.3) 5px)',
            }}
          />

          {/* 出勤時間帯の背景（明るい緑） */}
          {!isOff && shift.isWorking && (
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: Math.max(0, shiftLeft),
                width: shiftWidth,
                backgroundColor: '#dcfce7',
                borderLeft: '2px solid #86efac',
                borderRight: '2px solid #86efac',
              }}
            />
          )}

          {/* グリッド線 */}
          {timeLabels.map((time, i) => (
            <div
              key={time}
              className={`absolute top-0 bottom-0 border-r ${
                time.endsWith(':00') ? 'border-gray-300' : 'border-gray-200'
              }`}
              style={{ left: i * CELL_WIDTH }}
            />
          ))}

          {/* 休みオーバーレイ */}
          {(isOff || !shift.isWorking) && (
            <div className="absolute inset-0 bg-gray-200/60 z-10 flex items-center justify-center">
              <span className="text-xs text-gray-500 font-medium bg-white px-2 py-0.5 rounded-full border border-gray-300 shadow-sm">
                本日休み
              </span>
            </div>
          )}

          {/* 予約ブロック */}
          {shift.isWorking && !isOff && staffReservations.map((r) => {
            const rStart = timeToMinutes(String(r.start_time).slice(0, 5))
            const rEnd = timeToMinutes(String(r.end_time).slice(0, 5))
            const leftPos = ((rStart - startMinutes) / slotInterval) * CELL_WIDTH
            const width = ((rEnd - rStart) / slotInterval) * CELL_WIDTH - 2

            return (
              <div
                key={r.id}
                onClick={() => setEditTarget(r)}
                className={`absolute top-1 bottom-1 rounded-md border text-xs overflow-hidden z-20 cursor-pointer hover:shadow-lg hover:brightness-95 transition-all ${colorClass}`}
                style={{ left: leftPos + 1, width: Math.max(width, 40) }}
                title={`クリックして編集 / ${r.customer_name} / ${r.menu?.name}`}
              >
                <div className="px-1.5 py-1 h-full flex flex-col justify-center">
                  <p className="font-bold leading-tight truncate">
                    {r.customer_name || '匿名'}
                  </p>
                  <p className="leading-tight truncate opacity-80">
                    {r.menu?.name}
                  </p>
                  <p className="leading-tight opacity-60">
                    {String(r.start_time).slice(0, 5)}〜{String(r.end_time).slice(0, 5)}
                  </p>
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
    {editTarget && (
      <ReservationEditModal
        reservation={{
          id:               editTarget.id,
          staff_id:         editTarget.staff_id,
          menu_id:          editTarget.menu_id,
          start_time:       String(editTarget.start_time),
          end_time:         String(editTarget.end_time),
          customer_name:    editTarget.customer_name,
          gender:           (editTarget as any).gender ?? null,
          notes:            editTarget.notes,
          source:           (editTarget as any).source ?? 'phone',
          reservation_date: editTarget.reservation_date,
        }}
        staff={staff}
        menus={menus}
        businessStart={businessStart}
        lastCheckin={lastCheckin}
        slotInterval={slotInterval}
        onClose={() => setEditTarget(null)}
      />
    )}
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <div style={{ minWidth: HEADER_WIDTH + CELL_WIDTH * totalSlots + 'px' }}>

          {/* 時間ヘッダー */}
          <div className="flex bg-gray-800 sticky top-0 z-30">
            <div
              className="shrink-0 flex items-center justify-center border-r border-gray-600"
              style={{ width: HEADER_WIDTH, height: 44 }}
            >
              <span className="text-xs text-gray-300 font-medium">スタッフ</span>
            </div>
            {timeLabels.map((time) => (
              <div
                key={time}
                className={`shrink-0 flex items-center justify-center border-r text-xs ${
                  time.endsWith(':00')
                    ? 'border-gray-500 text-white font-bold'
                    : 'border-gray-700 text-gray-500'
                }`}
                style={{ width: CELL_WIDTH, height: 44 }}
              >
                {time.endsWith(':00') ? time : '·'}
              </div>
            ))}
          </div>

          {/* 出勤スタッフ */}
          {workingStaff.map((s) => renderStaffRow(s, false))}

          {/* 区切り */}
          {offStaff.length > 0 && workingStaff.length > 0 && (
            <div
              className="flex bg-gray-100 border-y border-dashed border-gray-300"
              style={{ height: 24 }}
            >
              <div
                className="shrink-0 flex items-center justify-center border-r border-gray-200 px-2"
                style={{ width: HEADER_WIDTH }}
              >
                <span className="text-xs text-gray-400 font-medium">休み</span>
              </div>
              <div className="flex-1" />
            </div>
          )}

          {/* 休みスタッフ */}
          {offStaff.map((s) => renderStaffRow(s, true))}

        </div>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded border border-green-300" style={{ backgroundColor: '#dcfce7' }} />
          <span>出勤時間帯</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded"
            style={{
              backgroundColor: '#f1f5f9',
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(148,163,184,0.5) 2px, rgba(148,163,184,0.5) 3px)',
            }}
          />
          <span>勤務外</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-pink-200 border border-pink-400 rounded" />
          <span>予約あり</span>
        </div>
        <span className="ml-auto hidden md:block">← 横スクロールで全時間帯を確認 / 予約ブロックをクリックで編集・削除</span>
      </div>
    </div>
    </>
  )
}
