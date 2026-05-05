'use client'

import { DayPicker } from 'react-day-picker'
import { ja } from 'date-fns/locale'
import { addDays, isBefore, startOfDay, isAfter, addMonths } from 'date-fns'
import 'react-day-picker/dist/style.css'

interface Props {
  settings: Record<string, string>
  selected: string | null
  onSelect: (date: string) => void
}

export default function StepDate({ settings, selected, onSelect }: Props) {
  const today = startOfDay(new Date())
  const maxDate = addMonths(today, 3)

  const selectedDate = selected ? new Date(selected) : undefined

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    const iso = date.toISOString().split('T')[0]
    onSelect(iso)
  }

  const formatDateJa = (date: Date): string => {
    const d = date
    const weekdays = ['日', '月', '火', '水', '木', '金', '土']
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">日付を選択</h2>
      <p className="text-sm text-gray-500 mb-6">ご希望の日付をお選びください</p>

      <div className="card p-4 flex justify-center">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          locale={ja}
          disabled={[
            { before: today },
            { after: maxDate },
          ]}
          modifiersClassNames={{
            selected: 'rdp-day_selected',
            today: 'rdp-day_today',
          }}
          styles={{
            caption: { color: '#be185d' },
          }}
          className="rdp-custom"
        />
      </div>

      {selected && (
        <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-lg text-center">
          <span className="text-pink-700 font-medium text-sm">
            {formatDateJa(new Date(selected))} を選択中
          </span>
        </div>
      )}

      <style jsx global>{`
        .rdp-custom .rdp-day_selected:not(.rdp-day_disabled) {
          background-color: #db2777;
          color: white;
          border-radius: 50%;
        }
        .rdp-custom .rdp-day:hover:not(.rdp-day_disabled):not(.rdp-day_selected) {
          background-color: #fce7f3;
          border-radius: 50%;
        }
        .rdp-custom .rdp-day_today:not(.rdp-day_selected) {
          color: #db2777;
          font-weight: bold;
        }
        .rdp-custom .rdp-nav_button:hover {
          background-color: #fce7f3;
        }
        .rdp-custom {
          --rdp-accent-color: #db2777;
        }
      `}</style>
    </div>
  )
}
