'use client'

import { useRouter } from 'next/navigation'
import { format, addDays, subDays } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function DateNavigation({ currentDate }: { currentDate: string }) {
  const router = useRouter()

  const prev = format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd')
  const next = format(addDays(new Date(currentDate), 1), 'yyyy-MM-dd')
  const today = format(new Date(), 'yyyy-MM-dd')

  const navigate = (date: string) => {
    router.push(`/admin?date=${date}`)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(prev)}
        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
      >
        ← 前日
      </button>

      <input
        type="date"
        value={currentDate}
        onChange={(e) => navigate(e.target.value)}
        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
      />

      <button
        onClick={() => navigate(next)}
        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
      >
        翌日 →
      </button>

      {currentDate !== today && (
        <button
          onClick={() => navigate(today)}
          className="px-3 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700 transition-colors"
        >
          今日
        </button>
      )}
    </div>
  )
}
