import { createClient } from '@/lib/supabase/server'
import SettingsManager from '@/components/admin/SettingsManager'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('settings').select('*')

  const settingsMap = Object.fromEntries((settings || []).map((s) => [s.key, s.value]))

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">設定</h1>
      <SettingsManager initialSettings={settingsMap} />
    </div>
  )
}
