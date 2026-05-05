import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { formatPrice } from '@/lib/utils'
import { format, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'

// このエンドポイントはcronジョブ（毎日20時）から呼び出す
// Vercel Cron / Supabase Edge Functionsで設定
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true })
  }

  const supabase = await createAdminClient()

  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const { data: reservations } = await supabase
    .from('reservations')
    .select('*, staff(*), menu:menus(*)')
    .eq('reservation_date', tomorrow)
    .eq('status', 'confirmed')

  if (!reservations || reservations.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  let sentCount = 0
  for (const r of reservations) {
    if (!r.customer_email) continue

    const dateStr = format(new Date(r.reservation_date), 'M月d日(EEE)', { locale: ja })
    const startTime = String(r.start_time).slice(0, 5)
    const endTime = String(r.end_time).slice(0, 5)
    const menuName = (r.menu as any)?.name || ''
    const staffName = (r.staff as any)?.name || 'おまかせ'

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
        to: r.customer_email,
        subject: `【前日リマインド】明日 ${dateStr} ${startTime}〜 りらくもみのき富士錦町店`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #db2777; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 20px;">🔔 明日のご予約リマインド</h1>
              <p style="color: #fce7f3; margin: 8px 0 0; font-size: 14px;">りらくもみのき富士錦町店</p>
            </div>
            <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
              <p style="color: #374151; font-size: 15px;">${r.customer_name} 様</p>
              <p style="color: #6b7280; font-size: 14px;">明日のご予約をお知らせします。</p>

              <div style="background: #fdf2f8; border: 2px solid #f9a8d4; border-radius: 10px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px; color: #be185d; font-size: 16px; font-weight: 700;">📅 ${dateStr} ${startTime}〜${endTime}</p>
                <p style="margin: 0; color: #374151; font-size: 14px;">${menuName} / 担当：${staffName}</p>
              </div>

              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
                ご来店をお待ちしております<br>
                りらくもみのき富士錦町店
              </p>
            </div>
          </div>
        `,
      })
      sentCount++
    } catch (e) {
      console.error(`Failed to send reminder to ${r.customer_email}:`, e)
    }
  }

  return NextResponse.json({ sent: sentCount })
}
