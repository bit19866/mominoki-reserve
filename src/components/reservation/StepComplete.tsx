'use client'

import { ReservationState } from './ReservationWizard'
import { formatDate, formatPrice } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  reservation: ReservationState
  reservationId: string
}

export default function StepComplete({ reservation, reservationId }: Props) {
  const totalPrice =
    (reservation.menu?.price || 0) + (reservation.staff ? 1650 : 0)

  return (
    <div className="text-center">
      {/* 完了アニメーション */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <span className="text-4xl">✅</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">予約が完了しました！</h2>
        <p className="text-gray-500 text-sm mt-2">
          確認メールをお送りしましたのでご確認ください
        </p>
      </div>

      {/* 予約詳細 */}
      <div className="card p-5 text-left mb-6">
        <p className="text-xs text-gray-400 mb-3">予約番号：{reservationId.slice(0, 8).toUpperCase()}</p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">日付</dt>
            <dd className="font-medium">{reservation.date ? formatDate(reservation.date) : ''}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">時間</dt>
            <dd className="font-medium">{reservation.time}〜{reservation.endTime}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">コース</dt>
            <dd className="font-medium">{reservation.menu?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">担当</dt>
            <dd className="font-medium">{reservation.staff?.name || 'おまかせ'}</dd>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <dt className="font-bold">合計</dt>
            <dd className="font-bold text-pink-600">{formatPrice(totalPrice)}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left mb-6">
        <p className="text-amber-800 text-sm font-medium mb-1">🔔 前日にリマインドメールをお送りします</p>
        <p className="text-amber-700 text-xs">キャンセルは1時間前まで「マイ予約」から可能です</p>
      </div>

      <div className="space-y-2">
        <Link href="/my-reservations" className="btn-primary w-full block text-center">
          予約を確認する
        </Link>
        <Link href="/" className="btn-secondary w-full block text-center">
          トップへ戻る
        </Link>
      </div>
    </div>
  )
}
