import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('user_id, role')
    .eq('user_id', user.id)
    .single() as { data: { user_id: string; role: string } | null }

  if (!adminUser) {
    redirect('/login')
  }

  const isOwner = adminUser.role === 'owner'

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white">りらくもみのき 管理画面</span>
          </div>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-gray-400 hover:text-white transition-colors">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <div className="flex">
        <AdminNav isOwner={isOwner} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
