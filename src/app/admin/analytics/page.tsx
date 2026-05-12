import { createClient } from '@/lib/supabase/server'
import AnalyticsDashboard from '@/components/admin/analytics/AnalyticsDashboard'
import { computeAnalytics } from '@/lib/analytics'

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const initialData = await computeAnalytics(supabase, 'month')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">集計・分析</h1>
        <p className="text-sm text-gray-500 mt-1">
          売上・予約データの集計と AI による経営分析レポート
        </p>
      </div>
      <AnalyticsDashboard initialData={initialData} />
    </div>
  )
}
