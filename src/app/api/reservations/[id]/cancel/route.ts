import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: reservation } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (!reservation) {
    return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 })
  }

  // 1時間前チェック
  const now = new Date()
  const startDateTime = new Date(`${reservation.reservation_date}T${reservation.start_time}`)
  if (startDateTime.getTime() - now.getTime() < 60 * 60 * 1000) {
    return NextResponse.json({ error: '1時間前を過ぎているためキャンセルできません' }, { status: 400 })
  }

  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'キャンセルに失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
