import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getOwnerUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('admin_users').select('role').eq('user_id', user.id).single() as { data: { role: string } | null }
  if (!data || data.role !== 'owner') return null
  return user
}

// PATCH /api/admin/commission-rates  { staffId, rate }
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  if (!await getOwnerUser(supabase)) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const { staffId, rate } = await request.json()
  if (typeof rate !== 'number' || rate < 0 || rate > 1) {
    return NextResponse.json({ error: '報酬率は0〜1の数値で指定してください' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('staff')
    .update({ commission_rate: rate })
    .eq('id', staffId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
