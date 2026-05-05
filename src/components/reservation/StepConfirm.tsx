'use client'

import { useState } from 'react'
import { ReservationState } from './ReservationWizard'
import { formatDate, formatPrice } from '@/lib/utils'

interface Props {
  reservation: ReservationState
  userId: string
  userEmail: string
  onComplete: (id: string) => void
  onBack: () => void
  onChange: (updates: Partial<ReservationState>) => void
}

export default function StepConfirm({
  reservation,
  userId,
  userEmail,
  onComplete,
  onBack,
  onChange,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPrice =
    (reservation.menu?.price || 0) + (reservation.staff ? 1650 : 0)

  const handleSubmit = async () => {
    if (!reservation.customerName.trim()) {
      setError('お名前を入力してください')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          staffId: reservation.staff?.id || null,
          menuId: reservation.menu?.id,
          reservationDate: reservation.date,
          startTime: reservation.time,
          endTime: reservation.endTime,
          customerName: reservation.customerName,
          customerEmail: userEmail,
          customerPhone: reservation.customerPhone,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '予約の作成に失敗しました')
        return
      }

      onComplete(data.id)
    } catch (e) {
      setError('予約の作成中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">予約内容の確認</h2>
      <p className="text-sm text-gray-500 mb-6">内容をご確認の上、予約を確定してください</p>

      {/* 予約内容サマリー */}
      <div className="card p-5 mb-5">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">予約内容</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">日付</dt>
            <dd className="font-medium text-gray-900">
              {reservation.date ? formatDate(reservation.date) : ''}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">時間</dt>
            <dd className="font-medium text-gray-900">
              {reservation.time}〜{reservation.endTime}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">コース</dt>
            <dd className="font-medium text-gray-900">{reservation.menu?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">スタッフ</dt>
            <dd className="font-medium text-gray-900">
              {reservation.staff ? (
                <span>{reservation.staff.name}（指名 ¥1,650）</span>
              ) : (
                'おまかせ'
              )}
            </dd>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <dt className="font-bold text-gray-900">合計</dt>
            <dd className="font-bold text-pink-600 text-base">{formatPrice(totalPrice)}</dd>
          </div>
        </dl>
      </div>

      {/* お客様情報 */}
      <div className="card p-5 mb-5">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">お客様情報</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reservation.customerName}
              onChange={(e) => onChange({ customerName: e.target.value })}
              placeholder="山田 花子"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              電話番号
            </label>
            <input
              type="tel"
              value={reservation.customerPhone}
              onChange={(e) => onChange({ customerPhone: e.target.value })}
              placeholder="090-1234-5678"
              className="input-field"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full text-base py-4"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-pink-200 border-t-white rounded-full animate-spin" />
              予約中...
            </div>
          ) : (
            '予約を確定する'
          )}
        </button>
        <button onClick={onBack} className="btn-secondary w-full">
          戻る
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        ※ 1時間前まで予約可能です。キャンセルは「マイ予約」から行えます。
      </p>
    </div>
  )
}
