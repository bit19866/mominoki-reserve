import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { formatDate, formatPrice } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const { reservationId } = await request.json()

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true })
  }

  const supabase = await createAdminClient()

  const { data: reservation } = await supabase
    .from('reservations')
    .select('*, staff(*), menu:menus(*)')
    .eq('id', reservationId)
    .single()

  if (!reservation || !reservation.customer_email) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }

  const totalPrice =
    (reservation.menu as any)?.price +
    ((reservation.staff as any) ? 1650 : 0)

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const dateStr = formatDate(reservation.reservation_date)
  const startTime = String(reservation.start_time).slice(0, 5)
  const endTime = String(reservation.end_time).slice(0, 5)
  const menuName = (reservation.menu as any)?.name || ''
  const staffName = (reservation.staff as any)?.name || 'おまかせ'
  const priceStr = formatPrice(totalPrice)

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
    to: reservation.customer_email,
    subject: `【予約確認】${dateStr} ${startTime}〜 りらくもみのき富士錦町店`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #db2777; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">🌿 ご予約確認</h1>
          <p style="color: #fce7f3; margin: 8px 0 0; font-size: 14px;">りらくもみのき富士錦町店</p>
        </div>
        <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 15px;">${reservation.customer_name} 様</p>
          <p style="color: #6b7280; font-size: 14px;">ご予約を承りました。以下の内容をご確認ください。</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 10px 0; color: #9ca3af; font-size: 13px; width: 100px;">日付</td>
              <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 600;">${dateStr}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 10px 0; color: #9ca3af; font-size: 13px;">時間</td>
              <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 600;">${startTime}〜${endTime}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 10px 0; color: #9ca3af; font-size: 13px;">コース</td>
              <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 600;">${menuName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 10px 0; color: #9ca3af; font-size: 13px;">担当</td>
              <td style="padding: 10px 0; color: #111827; font-size: 14px; font-weight: 600;">${staffName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #9ca3af; font-size: 13px;">合計</td>
              <td style="padding: 10px 0; color: #db2777; font-size: 16px; font-weight: 700;">${priceStr}</td>
            </tr>
          </table>

          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e; font-size: 13px;">
              📌 キャンセルは来店1時間前まで受付しております
            </p>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            ご来店をお待ちしております<br>
            りらくもみのき富士錦町店
          </p>
        </div>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}
