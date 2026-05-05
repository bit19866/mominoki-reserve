import { format, addMinutes, parse, isBefore, isAfter, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'

export function formatPrice(price: number): string {
  return `¥${price.toLocaleString('ja-JP')}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy年M月d日(EEE)', { locale: ja })
}

export function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function addMinutesToTime(time: string, minutes: number): string {
  const base = parse(time, 'HH:mm', new Date())
  const result = addMinutes(base, minutes)
  return format(result, 'HH:mm')
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number
): string[] {
  const slots: string[] = []
  const start = parse(startTime, 'HH:mm', new Date())
  const end = parse(endTime, 'HH:mm', new Date())
  let current = start

  while (!isAfter(current, end) && !current.equals?.(end)) {
    if (isBefore(current, end) || format(current, 'HH:mm') === endTime) {
      slots.push(format(current, 'HH:mm'))
    }
    current = addMinutes(current, intervalMinutes)
    if (format(current, 'HH:mm') === endTime || isAfter(current, end)) {
      break
    }
  }

  return slots
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function isTimeSlotAvailable(
  slotTime: string,
  durationMinutes: number,
  lastCheckinTime: string,
  cutoffMinutes: number,
  reservationDate: Date
): boolean {
  const now = new Date()
  const slotDate = new Date(reservationDate)
  const [h, m] = slotTime.split(':').map(Number)
  slotDate.setHours(h, m, 0, 0)

  // 締め切り時間チェック
  const cutoffTime = new Date(slotDate.getTime() - cutoffMinutes * 60 * 1000)
  if (isBefore(cutoffTime, now)) return false

  // 最終受付チェック（終了時間がlastCheckinTimeを超えないこと）
  const endMinutes = timeToMinutes(slotTime) + durationMinutes
  const lastCheckinMinutes = timeToMinutes(lastCheckinTime)
  if (endMinutes > lastCheckinMinutes + durationMinutes) return false

  return true
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
