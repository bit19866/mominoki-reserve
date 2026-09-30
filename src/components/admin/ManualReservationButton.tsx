'use client'

import { useState } from 'react'
import { Staff, Menu } from '@/types/database'
import ManualReservationModal from './ManualReservationModal'

interface Props {
  staff: Staff[]
  menus: Menu[]
  targetDate: string
  businessStart: string
  lastCheckin: string
  slotInterval: number
}

export default function ManualReservationButton({
  staff, menus, targetDate,
  businessStart, lastCheckin, slotInterval,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
      >
        <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span>
        手動予約
      </button>

      {open && (
        <ManualReservationModal
          staff={staff}
          menus={menus}
          targetDate={targetDate}
          businessStart={businessStart}
          lastCheckin={lastCheckin}
          slotInterval={slotInterval}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
