import { createClient } from '@/lib/supabase/server'
import AnalyticsDashboard from '@/components/admin/analytics/AnalyticsDashboard'
import WeatherWidget from '@/components/admin/analytics/WeatherWidget'
import { computeAnalytics } from '@/lib/analytics'

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const initialData = await computeAnalytics(supabase, 'month')

  return (
    <div>
      <div className="mb-5 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">集計・分析</h1>
        <p className="text-sm text-gray-500 mt-1">売上・顧客・時間帯データの分析レポート</p>
      </div>

      {/* 天気ウィジェット */}
      <WeatherWidget />

      <AnalyticsDashboard initialData={initialData} />
    </div>
  )
}
