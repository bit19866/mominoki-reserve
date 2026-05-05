'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CancelButton({ reservationId }: { reservationId: string }) {
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const router = useRouter()

  const handleCancel = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: 'POST',
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
      setConfirm(false)
    }
  }

  if (confirm) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? 'キャンセル中...' : 'キャンセルする'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 rounded-lg transition-colors"
        >
          戻る
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="w-full text-red-600 border border-red-200 hover:bg-red-50 text-sm py-2 rounded-lg transition-colors"
    >
      予約をキャンセル
    </button>
  )
}
