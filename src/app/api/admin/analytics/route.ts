import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { computeAnalytics, Period } from '@/lib/analytics'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: adminUser } = await supabase
    .from('admin_users').select('user_id').eq('user_id', user.id).single()
  if (!adminUser) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const params  = new URL(request.url).searchParams
  const period  = (params.get('period') || 'month') as Period
  const dateStr = params.get('date')  // 例: '2026-03-01'
  const refDate = dateStr ? new Date(dateStr) : undefined
  const data = await computeAnalytics(supabase, period, refDate)

  return NextResponse.json(data)
}
