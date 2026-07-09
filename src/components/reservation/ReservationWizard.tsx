'use client'

import { useState, useEffect } from 'react'
import { Menu, Staff, Profile } from '@/types/database'
import { formatDate, formatPrice } from '@/lib/utils'
import StepConfirm from './StepConfirm'
import StepComplete from './StepComplete'

type AvailabilityLevel = 'high' | 'medium' | 'low' | 'none' | 'past' | 'closed'

export interface ReservationState {
  date: string | null
  menu: Menu | null
  staff: Staff | null
  time: string | null
  endTime: string | null
  customerName: string
  customerPhone: string
}

interface Props {
  menus: Menu[]
  staff: Staff[]
  settings: Record<string, string>
  user: { id: string; email: string }
  profile: Profile | null
}

interface AvailableSlot {
  time: string
  endTime: string
  available: boolean
}

interface MatrixData {
  dates: string[]
  hours: string[]
  matrix: Record<string, Record<string, AvailabilityLevel>>
}

type Section = 'menu' | 'datetime' | 'staff'

export default function ReservationWizard({ menus, staff, settings, user, profile }: Props) {
  const [openSection, setOpenSection] = useState<Section>('menu')
  const [reservation, setReservation] = useState<ReservationState>({
    date: null,
    menu: null,
    staff: null,
    time: null,
    endTime: null,
    customerName: profile?.full_name || '',
    customerPhone: profile?.phone || '',
  })
  const [completedId, setCompletedId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Matrix state
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null)
  const [loadingMatrix, setLoadingMatrix] = useState(false)
  const [selectedHour, setSelectedHour] = useState<string | null>(null)

  // Time slots (for selected date+hour)
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Staff attendance
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})

  // Menu category filter
  const categories = ['すべて', ...Array.from(new Set(menus.map(m => m.category).filter(Boolean) as string[]))]
  const [selectedCategory, setSelectedCategory] = useState('すべて')
  const filteredMenus = selectedCategory === 'すべて'
    ? menus
    : menus.filter(m => m.category === selectedCategory)

  // Derived state
  const menuDone = !!reservation.menu
  const timeDone = !!(reservation.date && reservation.time)
  const isReady = menuDone && timeDone
  const totalPrice = (reservation.menu?.price ?? 0) + (reservation.staff ? 1650 : 0)

  // マトリクスデータ取得（メニュー選択後）
  useEffect(() => {
    if (!reservation.menu) return
    setMatrixData(null)
    setSelectedHour(null)
    setSlots([])
    setLoadingMatrix(true)
    const params = new URLSearchParams({ menuId: reservation.menu.id, days: '14' })
    fetch(`/api/availability/matrix?${params}`)
      .then(r => r.json())
      .then(data => setMatrixData(data))
      .catch(console.error)
      .finally(() => setLoadingMatrix(false))
  }, [reservation.menu?.id])

  // 時間スロット取得（日付選択後）
  useEffect(() => {
    if (!reservation.date || !reservation.menu) return
    setSlots([])
    setLoadingSlots(true)
    const params = new URLSearchParams({ date: reservation.date, menuId: reservation.menu.id })
    fetch(`/api/availability?${params}`)
      .then(r => r.json())
      .then(data => setSlots(data.slots || []))
      .catch(console.error)
      .finally(() => setLoadingSlots(false))
  }, [reservation.date, reservation.menu?.id])

  // Fetch staff attendance
  useEffect(() => {
    if (!reservation.date) return
    fetch(`/api/staff-attendance?date=${reservation.date}`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, boolean> = {}
        for (const s of (data.attendance || [])) {
          map[s.staffId] = s.isWorking
        }
        setAttendance(map)
      })
      .catch(console.error)
  }, [reservation.date])

  // Handlers
  const handleMenuSelect = (menu: Menu) => {
    setReservation(r => ({ ...r, menu, time: null, endTime: null }))
    setOpenSection('datetime')
  }

  // マトリクスのセルクリック
  const handleCellClick = (date: string, hour: string, level: AvailabilityLevel) => {
    if (level === 'past' || level === 'closed' || level === 'none') return
    setReservation(r => ({ ...r, date, time: null, endTime: null }))
    setSelectedHour(hour)
  }

  const handleTimeSelect = (slot: AvailableSlot) => {
    setReservation(r => ({ ...r, time: slot.time, endTime: slot.endTime }))
    setOpenSection('staff')
  }

  const handleStaffSelect = (s: Staff | null) => {
    setReservation(r => ({ ...r, staff: s }))
  }

  // Completion
  if (completedId) {
    return <StepComplete reservation={reservation} reservationId={completedId} />
  }

  if (showConfirm) {
    return (
      <StepConfirm
        reservation={reservation}
        userId={user.id}
        userEmail={user.email}
        onComplete={(id) => { setCompletedId(id) }}
        onBack={() => setShowConfirm(false)}
        onChange={(updates) => setReservation(r => ({ ...r, ...updates }))}
      />
    )
  }

  return (
    <>
      {/* DayPicker pink styling */}
      <style>{`
        .rdp-day_selected, .rdp-day_selected:hover {
          background-color: #ec4899 !important;
          color: white !important;
          border-radius: 9999px !important;
        }
        .rdp-day_today:not(.rdp-day_selected) {
          color: #ec4899 !important;
          font-weight: bold;
        }
        .rdp-button:hover:not(.rdp-day_selected) {
          background-color: #fce7f3 !important;
          border-radius: 9999px !important;
        }
        .rdp { margin: 0; }
        .rdp-months { justify-content: center; }
      `}</style>

      <div className="pb-32 space-y-3">

        {/* ── Section 1: メニュー ── */}
        <AccordionCard
          step={1}
          title="コース"
          done={menuDone}
          open={openSection === 'menu'}
          summary={reservation.menu
            ? `${reservation.menu.name}・${reservation.menu.duration_minutes}分・¥${reservation.menu.price.toLocaleString()}`
            : undefined}
          onHeaderClick={() => setOpenSection('menu')}
        >
          {/* カテゴリータブ */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* メニューカード */}
          <div className="space-y-2">
            {filteredMenus.map(menu => (
              <button
                key={menu.id}
                onClick={() => handleMenuSelect(menu)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  reservation.menu?.id === menu.id
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-100 bg-white hover:border-pink-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{menu.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{menu.duration_minutes}分</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">¥{menu.price.toLocaleString()}</p>
                    {reservation.menu?.id === menu.id && (
                      <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </AccordionCard>

        {/* ── Section 2: 日時 ── */}
        <AccordionCard
          step={2}
          title="日時"
          done={timeDone}
          open={openSection === 'datetime'}
          disabled={!menuDone}
          summary={reservation.date && reservation.time
            ? `${formatDate(reservation.date)}・${reservation.time}〜${reservation.endTime}`
            : undefined}
          onHeaderClick={() => menuDone && setOpenSection('datetime')}
        >
          {/* マトリクス表示 */}
          {loadingMatrix ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
            </div>
          ) : matrixData ? (
            <AvailabilityMatrix
              data={matrixData}
              selectedDate={reservation.date}
              selectedHour={selectedHour}
              onCellClick={handleCellClick}
            />
          ) : null}

          {/* 時間スロット（日付＋時間帯選択後に展開） */}
          {reservation.date && selectedHour && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-3">
                {formatDate(reservation.date)} {selectedHour}台 の時間を選択
              </p>
              {loadingSlots ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots
                    .filter(s => s.available && s.time.startsWith(selectedHour.slice(0, 2)))
                    .map(slot => (
                      <button
                        key={slot.time}
                        onClick={() => handleTimeSelect(slot)}
                        className={`py-3 rounded-xl text-sm font-medium transition-all ${
                          reservation.time === slot.time
                            ? 'bg-pink-500 text-white shadow-md shadow-pink-200'
                            : 'bg-gray-50 text-gray-700 border border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </AccordionCard>

        {/* ── Section 3: スタッフ ── */}
        <AccordionCard
          step={3}
          title="担当スタッフ"
          done={true}
          open={openSection === 'staff'}
          disabled={!timeDone}
          summary={reservation.staff ? `${reservation.staff.name}（指名料 +¥1,650）` : '指名なし（おまかせ）'}
          onHeaderClick={() => timeDone && setOpenSection('staff')}
        >
          <div className="space-y-2">
            {/* おまかせ */}
            <button
              onClick={() => handleStaffSelect(null)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                reservation.staff === null
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-gray-100 bg-white hover:border-pink-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900 text-sm">指名なし（おまかせ）</p>
                  <p className="text-xs text-gray-400 mt-0.5">指名料なし・出勤スタッフが担当</p>
                </div>
                {reservation.staff === null && (
                  <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>

            {/* スタッフ一覧 */}
            {staff.map(s => {
              const isWorking = attendance[s.id] !== false
              const isSelected = reservation.staff?.id === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => isWorking && handleStaffSelect(s)}
                  disabled={!isWorking}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                    !isWorking
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-100 bg-white hover:border-pink-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {/* アバター */}
                      <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-pink-600 font-bold text-sm">{s.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {isWorking ? '指名料 +¥1,650' : '本日休み'}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </AccordionCard>
      </div>

      {/* ── 固定底部ボタン ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 py-4 safe-area-pb">
        {/* 選択サマリー */}
        {isReady && (
          <div className="flex justify-between text-xs text-gray-400 mb-2 px-1">
            <span>{reservation.menu?.name}</span>
            <span>{reservation.date ? formatDate(reservation.date) : ''} {reservation.time}〜</span>
          </div>
        )}
        <button
          onClick={() => isReady && setShowConfirm(true)}
          disabled={!isReady}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            isReady
              ? 'bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white shadow-lg shadow-pink-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          style={{ minHeight: '56px' }}
        >
          {isReady
            ? `${formatPrice(totalPrice)}で予約を確定する`
            : 'コースと日時を選択してください'}
        </button>
      </div>
    </>
  )
}

// ── 空き状況マトリクス ──
const LEVEL_CONFIG: Record<AvailabilityLevel, { label: string; cell: string; text: string }> = {
  high:   { label: '◎', cell: 'bg-green-50  hover:bg-green-100  cursor-pointer', text: 'text-green-600 font-bold' },
  medium: { label: '○', cell: 'bg-blue-50   hover:bg-blue-100   cursor-pointer', text: 'text-blue-500  font-bold' },
  low:    { label: '△', cell: 'bg-yellow-50 hover:bg-yellow-100 cursor-pointer', text: 'text-yellow-500 font-bold' },
  none:   { label: '×', cell: 'bg-gray-50  cursor-not-allowed',                  text: 'text-gray-300' },
  past:   { label: '─', cell: 'bg-white    cursor-not-allowed',                  text: 'text-gray-200' },
  closed: { label: '休', cell: 'bg-gray-50  cursor-not-allowed',                  text: 'text-gray-300 text-xs' },
}

const DOW_JA = ['日', '月', '火', '水', '木', '金', '土']

function AvailabilityMatrix({
  data,
  selectedDate,
  selectedHour,
  onCellClick,
}: {
  data: MatrixData
  selectedDate: string | null
  selectedHour: string | null
  onCellClick: (date: string, hour: string, level: AvailabilityLevel) => void
}) {
  return (
    <div>
      {/* 凡例 */}
      <div className="flex gap-3 mb-3 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="text-green-600 font-bold">◎</span>空きあり</span>
        <span className="flex items-center gap-1"><span className="text-blue-500 font-bold">○</span>残りわずか</span>
        <span className="flex items-center gap-1"><span className="text-yellow-500 font-bold">△</span>あと1枠</span>
        <span className="flex items-center gap-1"><span className="text-gray-300">×</span>満員</span>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto -mx-5 px-5" style={{ scrollbarWidth: 'none' }}>
        <table className="border-collapse" style={{ minWidth: 'max-content' }}>
          <thead>
            <tr>
              {/* 左上の空白 */}
              <th className="sticky left-0 bg-white z-10 w-12 min-w-[48px]" />
              {data.dates.map(date => {
                const d = new Date(date + 'T00:00:00')
                const dow = DOW_JA[d.getDay()]
                const day = d.getDate()
                const isToday = date === new Date().toISOString().split('T')[0]
                const isSelected = date === selectedDate
                return (
                  <th
                    key={date}
                    className={`text-center pb-2 px-1 min-w-[44px] w-[44px]`}
                  >
                    <div className={`flex flex-col items-center gap-0.5`}>
                      <span className={`text-xs ${d.getDay() === 0 ? 'text-red-400' : d.getDay() === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                        {dow}
                      </span>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-pink-500 text-white'
                          : isToday
                          ? 'border-2 border-pink-400 text-pink-500'
                          : 'text-gray-700'
                      }`}>
                        {day}
                      </div>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {data.hours.map(hour => (
              <tr key={hour}>
                {/* 時間ラベル（固定列） */}
                <td className="sticky left-0 bg-white z-10 pr-2 text-right">
                  <span className="text-xs text-gray-400 font-medium">{hour}</span>
                </td>
                {/* セル */}
                {data.dates.map(date => {
                  const level = data.matrix[date]?.[hour] ?? 'past'
                  const cfg = LEVEL_CONFIG[level]
                  const isSelected = date === selectedDate && hour === selectedHour
                  return (
                    <td key={date} className="p-0.5">
                      <div
                        onClick={() => onCellClick(date, hour, level)}
                        className={`w-10 h-9 rounded-lg flex items-center justify-center transition-all ${cfg.cell} ${
                          isSelected ? 'ring-2 ring-pink-500 ring-offset-1' : ''
                        }`}
                      >
                        <span className={`text-sm ${cfg.text}`}>{cfg.label}</span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">← 横にスクロールできます →</p>
    </div>
  )
}

// ── アコーディオンカード ──
interface AccordionCardProps {
  step: number
  title: string
  done: boolean
  open: boolean
  disabled?: boolean
  summary?: string
  onHeaderClick: () => void
  children: React.ReactNode
}

function AccordionCard({
  step,
  title,
  done,
  open,
  disabled = false,
  summary,
  onHeaderClick,
  children,
}: AccordionCardProps) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      open ? 'border-pink-200 shadow-pink-100' : 'border-gray-100'
    } ${disabled ? 'opacity-50' : ''}`}>
      {/* ヘッダー */}
      <button
        onClick={onHeaderClick}
        disabled={disabled}
        className="w-full flex items-center gap-3 px-5 py-4 text-left disabled:cursor-not-allowed"
      >
        {/* ステップバッジ */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
          done
            ? 'bg-pink-500 text-white'
            : open
            ? 'bg-pink-100 text-pink-600 ring-2 ring-pink-300'
            : 'bg-gray-100 text-gray-400'
        }`}>
          {done ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : step}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm ${open ? 'text-pink-600' : 'text-gray-900'}`}>{title}</p>
          {summary && !open && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{summary}</p>
          )}
        </div>

        <svg
          className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* コンテンツ */}
      {open && (
        <div className="px-5 pb-5 border-t border-gray-50">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
