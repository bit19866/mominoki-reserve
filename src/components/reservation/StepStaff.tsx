'use client'

import { Staff } from '@/types/database'

interface Props {
  staff: Staff[]
  selected: Staff | null
  onSelect: (staff: Staff | null) => void
  onBack: () => void
}

const STAFF_ICONS = ['🌸', '🌿', '🍀', '🌺', '🌻', '🌼', '🌷', '🌹', '🪷']

export default function StepStaff({ staff, selected, onSelect, onBack }: Props) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">スタッフを選択</h2>
      <p className="text-sm text-gray-500 mb-6">
        ご希望のスタッフをお選びください（指名料：¥1,650）
      </p>

      {/* 指名なし */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full card p-4 text-left mb-3 transition-all hover:shadow-md ${
          selected === null
            ? 'border-pink-500 ring-2 ring-pink-200'
            : 'hover:border-pink-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
            🎲
          </div>
          <div>
            <p className="font-medium text-gray-900">指名なし（おまかせ）</p>
            <p className="text-xs text-gray-400">指名料なし・空いているスタッフが担当</p>
          </div>
          {selected === null && (
            <div className="ml-auto w-5 h-5 bg-pink-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
        </div>
      </button>

      {/* スタッフリスト */}
      <div className="grid grid-cols-2 gap-2">
        {staff.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`card p-4 text-center transition-all hover:shadow-md ${
              selected?.id === s.id
                ? 'border-pink-500 ring-2 ring-pink-200'
                : 'hover:border-pink-200'
            }`}
          >
            <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center text-2xl mx-auto mb-2">
              {STAFF_ICONS[i % STAFF_ICONS.length]}
            </div>
            <p className="font-medium text-gray-900 text-sm">{s.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">指名料 ¥1,650</p>
            {selected?.id === s.id && (
              <div className="mt-1 text-xs text-pink-600 font-medium">選択中</div>
            )}
          </button>
        ))}
      </div>

      <button onClick={onBack} className="mt-6 btn-secondary w-full">
        戻る
      </button>
    </div>
  )
}
