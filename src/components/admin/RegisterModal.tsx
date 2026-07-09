'use client'

import React, { useState } from 'react'
import { Menu } from '@/types/database'

interface ReservationInfo {
  id: string
  customer_name: string | null
  staff: { name: string } | null
  menu: { name: string; price: number } | null
  reservation_date: string
  start_time: string
  end_time: string
  staff_id: string
  menu_id: string
}

interface OptionItem { name: string; price: number }
type PaymentMethod = 'cash' | 'card' | 'paypay' | 'rakuten_pay'

const PayIcons: Record<PaymentMethod, React.ReactNode> = {
  cash: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
    </svg>
  ),
  card: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  paypay: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M8 12h8M12 8v8"/>
    </svg>
  ),
  rakuten_pay: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M9 8h4a2 2 0 0 1 0 4H9v4"/><path d="M13 12l3 4"/>
    </svg>
  ),
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; color: string }[] = [
  { value: 'cash',        label: '現金',     color: 'from-emerald-500 to-green-600'   },
  { value: 'card',        label: 'カード',   color: 'from-blue-500 to-indigo-600'     },
  { value: 'paypay',      label: 'PayPay',   color: 'from-red-500 to-rose-600'        },
  { value: 'rakuten_pay', label: '楽天ペイ', color: 'from-orange-500 to-amber-600'    },
]

const DISCOUNT_AMOUNTS = [100, 200, 500]
const CASH_PRESETS     = [1000, 2000, 3000, 5000, 10000]

interface Props {
  reservation: ReservationInfo
  optionMenus: Menu[]
  onClose: () => void
  onComplete: () => void
}

export default function RegisterModal({ reservation, optionMenus, onClose, onComplete }: Props) {
  const basePrice = reservation.menu?.price || 0

  const [options,         setOptions]         = useState<OptionItem[]>([])
  const [discount,        setDiscount]        = useState(0)
  const [payMethod,       setPayMethod]       = useState<PaymentMethod>('cash')
  const [cashReceived,    setCashReceived]    = useState('')
  const [notes,           setNotes]           = useState('')
  const [isNewCustomer,   setIsNewCustomer]   = useState<null | boolean>(null)
  const [ageGroup,        setAgeGroup]        = useState('')
  const [nextVisitBooked, setNextVisitBooked] = useState<null | boolean>(null)
  const [submitting,      setSubmitting]      = useState(false)
  const [done,            setDone]            = useState(false)

  const optionTotal = options.reduce((s, o) => s + o.price, 0)
  const total       = Math.max(0, basePrice + optionTotal - discount)
  const received    = parseInt(cashReceived) || 0
  const change      = payMethod === 'cash' ? Math.max(0, received - total) : 0
  const cashOk      = payMethod !== 'cash' || received >= total

  const addOption    = (m: Menu) => setOptions(p => [...p, { name: m.name, price: m.price }])
  const removeOption = (i: number) => setOptions(p => p.filter((_, j) => j !== i))
  const addDiscount  = (n: number) => setDiscount(p => p + n)

  const postPayment = async (body: object) => {
    setSubmitting(true)
    const res = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setDone(true)
      setTimeout(() => { onComplete(); onClose() }, 1400)
    }
    setSubmitting(false)
  }

  // 通常会計
  const handleSubmit = async () => {
    if (!cashOk) return
    await postPayment({
      reservation_id: reservation.id,
      customer_name: reservation.customer_name,
      staff_name: reservation.staff?.name,
      menu_name: reservation.menu?.name,
      reservation_date: reservation.reservation_date,
      base_price: basePrice,
      options,
      discount,
      total_amount:      total,
      payment_method:    payMethod,
      cash_received:     payMethod === 'cash' ? received : null,
      change_amount:     payMethod === 'cash' ? change : null,
      notes,
      is_new_customer:   isNewCustomer,
      age_group:         ageGroup || null,
      next_visit_booked: nextVisitBooked,
    })
  }

  // クイック会計済み（金額入力省略）
  const handleQuickDone = async () => {
    await postPayment({
      reservation_id:    reservation.id,
      customer_name:     reservation.customer_name,
      staff_name:        reservation.staff?.name,
      menu_name:         reservation.menu?.name,
      reservation_date:  reservation.reservation_date,
      base_price:        basePrice,
      options:           [],
      discount:          0,
      total_amount:      basePrice,
      payment_method:    'cash',
      cash_received:     null,
      change_amount:     null,
      notes:             notes || null,
      is_new_customer:   isNewCustomer,
      age_group:         ageGroup || null,
      next_visit_booked: nextVisitBooked,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl shadow-2xl max-h-[95vh] overflow-hidden flex flex-col">

        {/* ── ヘッダー ── */}
        <div className="bg-gray-950 text-white px-6 pt-6 pb-5 shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 tracking-widest uppercase mb-1">会計</p>
              <h2 className="text-2xl font-bold tracking-tight">
                {reservation.customer_name || '匿名'} 様
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {reservation.staff?.name} ・ {String(reservation.start_time).slice(0,5)}〜{String(reservation.end_time).slice(0,5)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >✕</button>
          </div>

          {/* 合計金額 */}
          <div className="bg-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">合計（税込）</span>
            <span className="text-3xl font-bold tabular-nums tracking-tight">
              ¥{total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── スクロール本文 ── */}
        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <p className="text-xl font-bold text-gray-800">会計完了</p>
            <p className="text-sm text-gray-400">¥{total.toLocaleString()} を受領しました</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-6">

              {/* 基本料金 */}
              <section>
                <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">基本料金</p>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">{reservation.menu?.name}</span>
                  <span className="font-bold text-gray-900">¥{basePrice.toLocaleString()}</span>
                </div>
              </section>

              {/* オプション */}
              {optionMenus.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">オプション</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {optionMenus.map(m => (
                      <button
                        key={m.id}
                        onClick={() => addOption(m)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all"
                      >
                        + {m.name} <span className="text-gray-400">¥{m.price.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                  {options.length > 0 && (
                    <div className="space-y-1.5">
                      {options.map((o, i) => (
                        <div key={i} className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                          <span className="text-sm text-indigo-800">{o.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-indigo-900">+¥{o.price.toLocaleString()}</span>
                            <button onClick={() => removeOption(i)} className="text-indigo-300 hover:text-red-400 transition-colors text-sm">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* 割引 */}
              <section>
                <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">割引</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {DISCOUNT_AMOUNTS.map(n => (
                    <button
                      key={n}
                      onClick={() => addDiscount(n)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-all"
                    >
                      −{n}円
                    </button>
                  ))}
                  {discount > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                      <span className="text-xs font-semibold text-amber-800">−¥{discount.toLocaleString()}</span>
                      <button onClick={() => setDiscount(0)} className="text-amber-400 hover:text-red-400 text-xs transition-colors">✕</button>
                    </div>
                  )}
                </div>
              </section>

              {/* 内訳 */}
              {(optionTotal > 0 || discount > 0) && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 border border-gray-100">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>基本料金</span><span>¥{basePrice.toLocaleString()}</span>
                  </div>
                  {optionTotal > 0 && (
                    <div className="flex justify-between text-sm text-indigo-600">
                      <span>オプション計</span><span>+¥{optionTotal.toLocaleString()}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-amber-600">
                      <span>割引</span><span>−¥{discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1.5">
                    <span>合計</span><span>¥{total.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* 年代 */}
              <section>
                <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">年代</p>
                <div className="grid grid-cols-3 gap-2">
                  {['10代', '20代', '30代', '40代', '50代', '60代以上'].map(group => (
                    <button
                      key={group}
                      onClick={() => setAgeGroup(v => v === group ? '' : group)}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        ageGroup === group
                          ? 'border-transparent bg-purple-600 text-white'
                          : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </section>

              {/* 次回予約 */}
              <section>
                <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">次回予約</p>
                <div className="flex gap-2">
                  {([
                    { value: true,  label: '予約あり', active: 'bg-teal-600 text-white border-teal-600'    },
                    { value: false, label: '予約なし', active: 'bg-gray-500 text-white border-gray-500'    },
                  ] as const).map(({ value, label, active }) => (
                    <button
                      key={String(value)}
                      onClick={() => setNextVisitBooked(v => v === value ? null : value)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        nextVisitBooked === value ? active : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* 支払い方法 */}
              <section>
                <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">支払い方法</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setPayMethod(m.value)}
                      className={`relative flex items-center gap-2.5 px-4 py-3.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        payMethod === m.value
                          ? 'border-transparent text-white shadow-lg scale-[1.02] bg-gradient-to-br ' + m.color
                          : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span>{PayIcons[m.value]}</span>
                      <span>{m.label}</span>
                      {payMethod === m.value && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white/70" />
                      )}
                    </button>
                  ))}
                </div>
                {payMethod !== 'cash' && (
                  <p className="text-xs text-gray-400 mt-2 text-center">iPad端末で決済後、記録してください</p>
                )}
              </section>

              {/* 現金 */}
              {payMethod === 'cash' && (
                <section>
                  <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">お預かり金額</p>
                  <div className="relative mb-3">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3.5 border-2 border-gray-200 focus:border-gray-900 rounded-xl text-right text-2xl font-bold tabular-nums focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 mb-3">
                    {CASH_PRESETS.map(n => (
                      <button
                        key={n}
                        onClick={() => setCashReceived(String(n))}
                        className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                          cashReceived === String(n)
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {n >= 1000 ? `${n/1000}千` : n}
                      </button>
                    ))}
                  </div>
                  {received >= total && received > 0 && (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
                      <span className="text-sm font-semibold text-emerald-700">お釣り</span>
                      <span className="text-3xl font-bold tabular-nums text-emerald-700">¥{change.toLocaleString()}</span>
                    </div>
                  )}
                  {received > 0 && received < total && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
                      <p className="text-sm text-red-500 font-medium">
                        あと ¥{(total - received).toLocaleString()} 不足しています
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* メモ */}
              <section>
                <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">メモ（任意）</p>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="備考があれば入力"
                  className="w-full px-4 py-3 border-2 border-gray-100 focus:border-gray-300 rounded-xl text-sm focus:outline-none transition-colors"
                />
              </section>

            </div>
          </div>
        )}

        {/* ── フッター：会計ボタン ── */}
        {!done && (
          <div className="p-4 border-t border-gray-100 bg-white shrink-0 space-y-2">
            {/* 通常会計ボタン */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !cashOk}
              className={`w-full py-4 rounded-2xl text-white font-bold text-lg tracking-wide transition-all shadow-lg active:scale-[0.98] ${
                cashOk && !submitting ? 'bg-gray-950 hover:bg-gray-800' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {submitting ? '処理中...' : `¥${total.toLocaleString()} を会計する`}
            </button>

            {/* クイック会計済みボタン（過去分・詳細省略） */}
            <button
              onClick={handleQuickDone}
              disabled={submitting}
              className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              会計済みとして記録（金額省略）
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
