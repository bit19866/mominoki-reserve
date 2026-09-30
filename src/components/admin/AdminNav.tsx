'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// シンプルなSVGアイコン（色はCSSで制御）
const Icons = {
  schedule: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  shift: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="13" y2="18" />
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
  menus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  staff: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  compensation: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
}

const NAV_ITEMS = [
  { href: '/admin',              label: 'スケジュール', icon: Icons.schedule },
  { href: '/admin/shifts',       label: 'シフト管理',   icon: Icons.shift },
  { href: '/admin/analytics',    label: '集計・分析',   icon: Icons.analytics },
  { href: '/admin/menus',        label: 'メニュー管理', icon: Icons.menus },
  { href: '/admin/staff',        label: 'スタッフ管理', icon: Icons.staff },
  { href: '/admin/settings',     label: '設定',         icon: Icons.settings },
]

const OWNER_NAV_ITEMS = [
  { href: '/admin/compensation', label: '報酬管理', icon: Icons.compensation },
]

export default function AdminNav({ isOwner = false }: { isOwner?: boolean }) {
  const pathname = usePathname()

  return (
    <aside className="shrink-0 flex flex-col min-h-[calc(100vh-56px)] bg-gray-800" style={{ width: 200 }}>

      {/* ブランドエリア */}
      <div className="px-5 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2 text-white font-bold text-base leading-tight">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-13 6 0 0 2-4 3-7 6-1 10-2 10-2s-3 3-5 8z"/></svg>
          もみのき
        </div>
        <div className="text-gray-400 text-xs mt-1">予約管理システム</div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-widest uppercase text-gray-500">
          メニュー
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-l-4 ${
                isActive
                  ? 'bg-gray-700 border-white text-white'
                  : 'border-transparent text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}

        {isOwner && (
          <>
            <div className="pt-4 pb-1 mt-2 border-t border-gray-700">
              <p className="px-3 pb-2 text-[10px] font-semibold tracking-widest uppercase text-gray-500">
                オーナー専用
              </p>
            </div>
            {OWNER_NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-l-4 ${
                    isActive
                      ? 'bg-gray-700 border-white text-white'
                      : 'border-transparent text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* フッター */}
      <div className="px-5 py-3 border-t border-gray-700">
        <div className="text-[10px] text-center text-gray-600">りらくもみのき © 2025</div>
      </div>
    </aside>
  )
}
