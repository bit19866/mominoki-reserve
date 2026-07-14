import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const date = request.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json([])

  const { data } = await db.from('register_checks').select('*').eq('check_date', date)
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { date, check_type, amount, notes } = await request.json()

  const { data, error } = await db
    .from('register_checks')
    .upsert(
      { check_date: date, check_type, amount: amount || 0, notes: notes || null, updated_at: new Date().toISOString() },
      { onConflict: 'check_date,check_type' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
