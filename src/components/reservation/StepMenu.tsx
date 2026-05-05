'use client'

import { Menu } from '@/types/database'
import { formatPrice } from '@/lib/utils'
import { useState } from 'react'

interface Props {
  menus: Menu[]
  selected: Menu | null
  onSelect: (menu: Menu) => void
  onBack: () => void
}

export default function StepMenu({ menus, selected, onSelect, onBack }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // カテゴリーグループ
  const categories = Array.from(
    new Set(menus.filter((m) => m.duration_minutes > 0).map((m) => m.category || 'その他'))
  )

  const filteredMenus = menus.filter((m) => {
    if (m.duration_minutes === 0) return false // オプションは除外
    if (activeCategory) return m.category === activeCategory
    return true
  })

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">コースを選択</h2>
      <p className="text-sm text-gray-500 mb-4">ご希望のコースをお選びください</p>

      {/* カテゴリータブ */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => setActiveCategory(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeCategory === null
              ? 'bg-pink-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300'
          }`}
        >
          すべて
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-pink-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* メニューリスト */}
      <div className="space-y-2">
        {filteredMenus.map((menu) => (
          <button
            key={menu.id}
            onClick={() => onSelect(menu)}
            className={`w-full card p-4 text-left transition-all hover:shadow-md ${
              selected?.id === menu.id
                ? 'border-pink-500 ring-2 ring-pink-200'
                : 'hover:border-pink-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{menu.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {menu.duration_minutes}分
                  {menu.category && (
                    <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-full">
                      {menu.category}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-pink-600">{formatPrice(menu.price)}</p>
                <p className="text-xs text-gray-400">税込</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button onClick={onBack} className="mt-6 btn-secondary w-full">
        戻る
      </button>
    </div>
  )
}
