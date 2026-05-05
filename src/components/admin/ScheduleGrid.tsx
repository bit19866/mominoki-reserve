'use client'

import { Staff, Reservation } from '@/types/database'
import { timeToMinutes, minutesToTime } from '@/lib/utils'

interface ReservationWithDetails extends Reservation {
  menu: { name: string; duration_minutes: number; price: number } | null
  staff: { name: string } | null
}

interface Props {
  staff: Staff[]
  reservations: ReservationWithDetails[]
  businessStart: string
  lastCheckin: string
  slotInterval: number
  targetDate: string
}

const CELL_WIDTH = 80
const CELL_HEIGHT = 56
const HEADER_WIDTH = 72

// 時間軸ラベル（30分刻み）
function generateTimeLabels(start: string, end: string, interval: number): string[] {
  const labels: string[] = []
  const startM = timeToMinutes(start)
  const endM = timeToMinutes(end)
  for (let m = startM; m <= endM; m += interval) {
    labels.push(minutesToTime(m))
  }
  return labels
}

const PASTEL_COLORS = [
  'bg-pink-100 border-pink-300 text-pink-800',
  'bg-purple-100 border-purple-300 text-purple-800',
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-green-100 border-green-300 text-green-800',
  'bg-yellow-100 border-yellow-300 text-yellow-800',
  'bg-orange-100 border-orange-300 text-orange-800',
  'bg-teal-100 border-teal-300 text-teal-800',
  'bg-indigo-100 border-indigo-300 text-indigo-800',
  'bg-rose-100 border-rose-300 text-rose-800',
]

export default function ScheduleGrid({
  staff,
  reservations,
  businessStart,
  lastCheckin,
  slotInterval,
  targetDate,
}: Props) {
  const timeLabels = generateTimeLabels(businessStart, lastCheckin, slotInterval)
  const startMinutes = timeToMinutes(businessStart)
  const totalSlots = timeLabels.length

  const getReservationForStaff = (staffId: string) =>
    reservations.filter((r) => r.staff_id === staffId)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div
          style={{
            minWidth: HEADER_WIDTH + CELL_WIDTH * totalSlots + 'px',
          }}
        >
          {/* 時間ヘッダー */}
          <div className="flex bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <div
              className="shrink-0 flex items-center justify-center bg-gray-50 border-r border-gray-200"
              style={{ width: HEADER_WIDTH, height: 40 }}
            >
              <span className="text-xs text-gray-400">スタッフ</span>
            </div>
            {timeLabels.map((time, i) => (
              <div
                key={time}
                className={`shrink-0 flex items-center justify-center border-r text-xs font-medium ${
                  time.endsWith(':00') ? 'border-gray-300 bg-gray-50 text-gray-700' : 'border-gray-100 text-gray-400'
                }`}
                style={{ width: CELL_WIDTH, height: 40 }}
              >
                {time.endsWith(':00') ? time : ''}
              </div>
            ))}
          </div>

          {/* スタッフ行 */}
          {staff.map((s, staffIndex) => {
            const staffReservations = getReservationForStaff(s.id)

            return (
              <div
                key={s.id}
                className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors relative"
                style={{ height: CELL_HEIGHT }}
              >
                {/* スタッフ名 */}
                <div
                  className="shrink-0 flex items-center justify-center border-r border-gray-200 bg-white z-10"
                  style={{ width: HEADER_WIDTH, height: CELL_HEIGHT }}
                >
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-700">{s.name}</div>
                  </div>
                </div>

                {/* 時間グリッド背景 */}
                <div className="relative flex-1">
                  {/* グリッド線 */}
                  {timeLabels.map((time, i) => (
                    <div
                      key={time}
                      className={`absolute top-0 bottom-0 border-r ${
                        time.endsWith(':00') ? 'border-gray-200' : 'border-gray-100'
                      }`}
                      style={{ left: i * CELL_WIDTH, width: CELL_WIDTH }}
                    />
                  ))}

                  {/* 予約ブロック */}
                  {staffReservations.map((r, ri) => {
                    const rStart = timeToMinutes(String(r.start_time).slice(0, 5))
                    const rEnd = timeToMinutes(String(r.end_time).slice(0, 5))
                    const leftPos = (rStart - startMinutes) / slotInterval * CELL_WIDTH
                    const width = (rEnd - rStart) / slotInterval * CELL_WIDTH - 2

                    const colorClass = PASTEL_COLORS[staffIndex % PASTEL_COLORS.length]

                    return (
                      <div
                        key={r.id}
                        className={`absolute top-1 bottom-1 rounded-md border text-xs overflow-hidden ${colorClass} cursor-pointer hover:shadow-md transition-shadow`}
                        style={{
                          left: leftPos + 1,
                          width: Math.max(width, 40),
                        }}
                        title={`${r.customer_name} / ${r.menu?.name} / ${String(r.start_time).slice(0,5)}〜${String(r.end_time).slice(0,5)}`}
                      >
                        <div className="px-1.5 py-1 h-full flex flex-col justify-center">
                          <p className="font-semibold leading-tight truncate">
                            {r.customer_name || '匿名'}
                          </p>
                          <p className="leading-tight truncate opacity-75">
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
          })}

          {/* 現在時刻ライン */}
          <CurrentTimeLine
            startMinutes={startMinutes}
            slotInterval={slotInterval}
            headerWidth={HEADER_WIDTH}
            cellWidth={CELL_WIDTH}
            targetDate={targetDate}
          />
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-pink-100 border border-pink-300 rounded" />
          <span>予約あり</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-white border border-gray-200 rounded" />
          <span>空き</span>
        </div>
        <span className="ml-auto">横スクロールで全時間帯を確認できます</span>
      </div>
    </div>
  )
}

function CurrentTimeLine({
  startMinutes,
  slotInterval,
  headerWidth,
  cellWidth,
  targetDate,
}: {
  startMinutes: number
  slotInterval: number
  headerWidth: number
  cellWidth: number
  targetDate: string
}) {
  const today = new Date().toISOString().split('T')[0]
  if (targetDate !== today) return null

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const leftPos = headerWidth + (currentMinutes - startMinutes) / slotInterval * cellWidth

  if (leftPos < headerWidth) return null

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
      style={{ left: leftPos }}
    >
      <div className="absolute top-0 -left-1 w-2 h-2 rounded-full bg-red-500" />
    </div>
  )
}
