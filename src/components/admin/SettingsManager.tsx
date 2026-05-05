'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  initialSettings: Record<string, string>
}

export default function SettingsManager({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const entries = Object.entries(settings)

    for (const [key, value] of entries) {
      await supabase
        .from('settings')
        .upsert({ key, value, updated_at: new Date().toISOString() })
    }

    setSaving(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* 営業時間設定 */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4">営業時間</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-28">営業開始</label>
            <input
              type="time"
              value={settings['business_start_time'] || '10:00'}
              onChange={(e) => update('business_start_time', e.target.value)}
              className="input-field text-sm w-32"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-28">営業終了</label>
            <input
              type="time"
              value={settings['business_end_time'] || '24:00'}
              onChange={(e) => update('business_end_time', e.target.value)}
              className="input-field text-sm w-32"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-28">最終受付</label>
            <input
              type="time"
              value={settings['last_checkin_time'] || '23:00'}
              onChange={(e) => update('last_checkin_time', e.target.value)}
              className="input-field text-sm w-32"
            />
          </div>
        </div>
      </div>

      {/* 予約設定 */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4">予約受付設定</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-28">受付締め切り</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="1440"
                value={settings['cutoff_minutes_before'] || '60'}
                onChange={(e) => update('cutoff_minutes_before', e.target.value)}
                className="input-field text-sm w-24"
              />
              <span className="text-sm text-gray-500">分前まで受付</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-28">スロット間隔</label>
            <div className="flex items-center gap-2">
              <select
                value={settings['reservation_slot_minutes'] || '30'}
                onChange={(e) => update('reservation_slot_minutes', e.target.value)}
                className="input-field text-sm w-24"
              >
                <option value="15">15分</option>
                <option value="30">30分</option>
                <option value="60">60分</option>
              </select>
              <span className="text-sm text-gray-500">刻み</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 w-28">ベッド数</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="20"
                value={settings['total_beds'] || '5'}
                onChange={(e) => update('total_beds', e.target.value)}
                className="input-field text-sm w-24"
              />
              <span className="text-sm text-gray-500">台</span>
            </div>
          </div>
        </div>
      </div>

      {/* 店舗情報 */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4">店舗情報</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">店舗名</label>
            <input
              value={settings['store_name'] || ''}
              onChange={(e) => update('store_name', e.target.value)}
              className="input-field text-sm"
            />
          </div>
        </div>
      </div>

      {/* 決済設定（将来用プレースホルダー） */}
      <div className="card p-5 border-dashed border-2 border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="font-bold text-gray-400">決済設定</h2>
          <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">準備中</span>
        </div>
        <p className="text-sm text-gray-400">
          Stripe連携による事前決済機能は今後追加予定です。
          <br />API設定はここに追加されます。
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? '保存中...' : '設定を保存'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">✓ 保存しました</span>
        )}
      </div>
    </div>
  )
}
