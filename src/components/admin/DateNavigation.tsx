'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isAfter } from 'date-fns'
import { ja } from 'date-fns/locale'

const DOW = ['日', '月', '火', '水', '木', '金', '土']

export default function DateNavigation({ currentDate }: { currentDate: string }) {
  const router  = useRouter()
  const today   = format(new Date(), 'yyyy-MM-dd')
  const isToday = currentDate === today

  const navigate = (date: string) => {
    router.push(`/admin?date=${date}`)
    setOpen(false)
  }

  // カレンダーポップアップ状態
  const [open,      setOpen]      = useState(false)
  const [calMonth,  setCalMonth]  = useState(() => {
    // 表示中の日付の月からカレンダー開始
    const d = new Date(currentDate)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const popupRef = useRef<HTMLDivElement>(null)

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // カレンダーを開くとき：現在表示中の日付の月に合わせる
  const handleOpen = () => {
    const d = new Date(currentDate)
    setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    setOpen(v => !v)
  }

  // カレンダーの日付一覧生成
  const monthStart = startOfMonth(calMonth)
  const monthEnd   = endOfMonth(calMonth)
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // 月の最初の日の曜日に合わせて先頭に空白を追加
  const startDow = monthStart.getDay() // 0=日
  const blanks   = Array(startDow).fill(null)

  const prev    = format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd')
  const next    = format(addDays(new Date(currentDate), 1), 'yyyy-MM-dd')

  return (
    <div className="flex items-center gap-2 mb-4">
      {/* 前日 */}
      <button
        onClick={() => navigate(prev)}
        className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-bold"
        title="前日"
      >‹</button>

      {/* 日付ボタン + カレンダーポップアップ */}
      <div className="relative" ref={popupRef}>
        <button
          onClick={handleOpen}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          style={{ minWidth: 200 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="text-sm font-semibold text-gray-800">
            {format(new Date(currentDate), 'yyyy年M月d日', { locale: ja })}
          </span>
          <span className="text-xs text-gray-400">
            ({format(new Date(currentDate), 'EEE', { locale: ja })})
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {/* カレンダーポップアップ */}
        {open && (
          <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3" style={{ width: 280 }}>

            {/* 月ナビ */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCalMonth(m => subMonths(m, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-bold"
              >‹</button>
              <span className="text-sm font-bold text-gray-800">
                {format(calMonth, 'yyyy年M月', { locale: ja })}
              </span>
              <button
                onClick={() => {
                  const next = addMonths(calMonth, 1)
                  // 未来月には行かせない（今月まで）
                  const nowMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                  if (!isAfter(next, nowMonth)) setCalMonth(next)
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg font-bold transition-colors ${
                  isSameMonth(calMonth, new Date())
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                disabled={isSameMonth(calMonth, new Date())}
              >›</button>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 mb-1">
              {DOW.map((d, i) => (
                <div key={d} className={`text-center text-[11px] font-semibold py-1 ${
                  i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
                }`}>{d}</div>
              ))}
            </div>

            {/* 日付グリッド */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {/* 先頭の空白 */}
              {blanks.map((_, i) => <div key={`b${i}`} />)}

              {days.map(day => {
                const dateStr    = format(day, 'yyyy-MM-dd')
                const isSelected = dateStr === currentDate
                const isTodayDay = dateStr === today
                const isFuture   = isAfter(day, new Date())
                const dow        = day.getDay()

                return (
                  <button
                    key={dateStr}
                    onClick={() => !isFuture && navigate(dateStr)}
                    disabled={isFuture}
                    className={`
                      w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-colors
                      ${isSelected
                        ? 'bg-gray-800 text-white font-bold'
                        : isTodayDay
                        ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200'
                        : isFuture
                        ? 'text-gray-300 cursor-not-allowed'
                        : dow === 0
                        ? 'text-red-500 hover:bg-red-50'
                        : dow === 6
                        ? 'text-blue-500 hover:bg-blue-50'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>

            {/* 今日に戻るボタン */}
            {!isToday && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => navigate(today)}
                  className="w-full py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  今日に戻る
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 翌日 */}
      <button
        onClick={() => navigate(next)}
        className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-bold"
        title="翌日"
      >›</button>

      {!isToday && (
        <button
          onClick={() => navigate(today)}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold transition-colors"
        >
          今日
        </button>
      )}

      {isToday && (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
          本日
        </span>
      )}
    </div>
  )
}
