import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { AnalyticsData } from '@/lib/analytics'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: adminUser } = await supabase
    .from('admin_users').select('user_id').eq('user_id', user.id).single()
  if (!adminUser) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const analyticsData: AnalyticsData = await request.json()

  if (analyticsData.summary.totalReservations === 0) {
    return NextResponse.json({
      analysis: 'この期間にデータがありません。予約が入ってから分析してください。',
    })
  }

  const client = new Anthropic()

  const top7days = analyticsData.dailySales
    .filter(d => d.count > 0)
    .slice(-7)
    .map(d => `  ${d.date}: ${d.count}件 ¥${d.revenue.toLocaleString()}`)
    .join('\n') || '  なし'

  const prompt = `あなたはマッサージ店「りらくもみのき富士錦町店」の経営コンサルタントです。
以下の予約・売上データを分析して、店舗オーナー向けの経営アドバイスレポートを作成してください。

【データ期間】${analyticsData.period.from} 〜 ${analyticsData.period.to}

【売上サマリー】
  売上合計: ¥${analyticsData.summary.totalRevenue.toLocaleString()}
  予約件数: ${analyticsData.summary.totalReservations}件
  客単価:   ¥${analyticsData.summary.avgRevenue.toLocaleString()}

【男女別内訳】
${analyticsData.genderBreakdown.map(g =>
  `  ${g.label}: ${g.count}件（¥${g.revenue.toLocaleString()}）`
).join('\n') || '  データなし'}

【人気コース TOP10】
${analyticsData.menuBreakdown.map((m, i) =>
  `  ${i + 1}. ${m.name}: ${m.count}件（¥${m.revenue.toLocaleString()}）`
).join('\n') || '  データなし'}

【スタッフ別件数】
${analyticsData.staffBreakdown.map(s =>
  `  ${s.name}: ${s.count}件（¥${s.revenue.toLocaleString()}）`
).join('\n') || '  データなし'}

【日次売上（直近7日）】
${top7days}

以下の観点でオーナーへのレポートを書いてください：

◆ 全体評価
　売上・集客の状況をデータを引用しながら具体的に評価してください。

◆ 強みと課題
　データから読み取れるポジティブな点と、改善の余地がある点を挙げてください。

◆ 人気コース・客層の分析
　どのコースが選ばれているか、男女比から見えることなど。

◆ 今すぐできる改善提案（3つ）
　売上向上・集客改善につながる具体的なアクションを3つ提案してください。

マークダウン記号（##、**、- など）は使わず、◆ 見出しと通常の文章で書いてください。
読みやすく、専門用語を避けた文体で書いてください。
`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1400,
    messages: [{ role: 'user', content: prompt }],
  })

  const analysis = message.content[0].type === 'text' ? message.content[0].text : ''

  return NextResponse.json({ analysis })
}
