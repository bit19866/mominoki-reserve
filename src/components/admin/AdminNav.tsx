'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin',            label: 'スケジュール', icon: '📅' },
  { href: '/admin/shifts',     label: 'シフト管理',   icon: '🗓️' },
  { href: '/admin/analytics',  label: '集計・分析',   icon: '📊' },
  { href: '/admin/menus',      label: 'メニュー管理', icon: '📋' },
  { href: '/admin/staff',      label: 'スタッフ管理', icon: '👥' },
  { href: '/admin/settings',   label: '設定',         icon: '⚙️' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <aside className="w-48 bg-gray-800 min-h-[calc(100vh-56px)] py-4">
      <nav className="space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-pink-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
