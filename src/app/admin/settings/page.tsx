import { createClient } from '@/lib/supabase/server'
import SettingsManager from '@/components/admin/SettingsManager'
import HolidayManager from '@/components/admin/HolidayManager'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('settings').select('*')
  const { data: holidays } = await supabase
    .from('store_holidays')
    .select('*')
    .order('holiday_date')

  const settingsMap = Object.fromEntries(((settings || []) as any[]).map((s: any) => [s.key, s.value]))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-6">設定</h1>
        <SettingsManager initialSettings={settingsMap} />
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-6">休業日管理</h1>
        <HolidayManager initialHolidays={holidays || []} />
      </div>
    </div>
  )
}
