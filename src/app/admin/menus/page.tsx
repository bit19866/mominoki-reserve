import { createClient } from '@/lib/supabase/server'
import MenuManager from '@/components/admin/MenuManager'

export default async function AdminMenusPage() {
  const supabase = await createClient()
  const { data: menus } = await supabase
    .from('menus')
    .select('*')
    .order('sort_order')
    .order('category')

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">メニュー管理</h1>
      <MenuManager initialMenus={menus || []} />
    </div>
  )
}
