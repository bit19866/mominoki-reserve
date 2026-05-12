'use client'

import { useState, useCallback } from 'react'
import { Menu, Staff, Profile } from '@/types/database'
import StepDate from './StepDate'
import StepMenu from './StepMenu'
import StepStaff from './StepStaff'
import StepTime from './StepTime'
import StepConfirm from './StepConfirm'
import StepComplete from './StepComplete'

export interface ReservationState {
  date: string | null
  menu: Menu | null
  staff: Staff | null
  time: string | null
  endTime: string | null
  customerName: string
  customerPhone: string
}

interface Props {
  menus: Menu[]
  staff: Staff[]
  settings: Record<string, string>
  user: { id: string; email: string }
  profile: Profile | null
}

const STEPS = [
  { label: '日付', icon: '📅' },
  { label: 'コース', icon: '💆' },
  { label: 'スタッフ', icon: '👤' },
  { label: '時間', icon: '🕐' },
  { label: '確認', icon: '✅' },
]

export default function ReservationWizard({ menus, staff, settings, user, profile }: Props) {
  const [step, setStep] = useState(0)
  const [reservation, setReservation] = useState<ReservationState>({
    date: null,
    menu: null,
    staff: null,
    time: null,
    endTime: null,
    customerName: profile?.full_name || '',
    customerPhone: profile?.phone || '',
  })
  const [completedReservationId, setCompletedReservationId] = useState<string | null>(null)

  const updateReservation = useCallback((updates: Partial<ReservationState>) => {
    setReservation((prev) => ({ ...prev, ...updates }))
  }, [])

  const goNext = () => setStep((s) => s + 1)
  const goBack = () => setStep((s) => s - 1)

  if (completedReservationId) {
    return (
      <StepComplete
        reservation={reservation}
        reservationId={completedReservationId}
      />
    )
  }

  return (
    <div>
      {/* ステップインジケーター */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`step-indicator ${
                  i < step
                    ? 'bg-pink-600 text-white'
                    : i === step
                    ? 'bg-pink-600 text-white ring-4 ring-pink-100'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 ${i === step ? 'text-pink-600 font-medium' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mt-[-12px] ${i < step ? 'bg-pink-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ステップコンテンツ */}
      {step === 0 && (
        <StepDate
          settings={settings}
          selected={reservation.date}
          onSelect={(date) => { updateReservation({ date }); goNext() }}
        />
      )}
      {step === 1 && (
        <StepMenu
          menus={menus}
          selected={reservation.menu}
          onSelect={(menu) => { updateReservation({ menu }); goNext() }}
          onBack={goBack}
        />
      )}
      {step === 2 && (
        <StepStaff
          staff={staff}
          selected={reservation.staff}
          onSelect={(s) => { updateReservation({ staff: s }); goNext() }}
          onBack={goBack}
          date={reservation.date!}
        />
      )}
      {step === 3 && (
        <StepTime
          date={reservation.date!}
          menu={reservation.menu!}
          staff={reservation.staff}
          settings={settings}
          selectedTime={reservation.time}
          onSelect={(time, endTime) => { updateReservation({ time, endTime }); goNext() }}
          onBack={goBack}
        />
      )}
      {step === 4 && (
        <StepConfirm
          reservation={reservation}
          userId={user.id}
          userEmail={user.email}
          onComplete={(id) => setCompletedReservationId(id)}
          onBack={goBack}
          onChange={updateReservation}
        />
      )}
    </div>
  )
}
