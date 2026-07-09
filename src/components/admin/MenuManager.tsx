'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'

interface Props {
  initialMenus: Menu[]
}

type FormData = {
  name: string
  duration_minutes: string
  price: string
  price_ex_tax: string
  category: string
  active: boolean
  sort_order: string
}

const emptyForm: FormData = {
  name: '',
  duration_minutes: '',
  price: '',
  price_ex_tax: '',
  category: '',
  active: true,
  sort_order: '0',
}

function FormFields({ form, setForm, categories }: {
  form: FormData
  setForm: React.Dispatch<React.SetStateAction<FormData>>
  categories: string[]
}) {
  const handlePriceChange = (val: string) => {
    const tax = val ? Math.round(parseInt(val) / 1.1) : 0
    setForm(f => ({ ...f, price: val, price_ex_tax: val ? String(tax) : '' }))
  }

  const handleExTaxChange = (val: string) => {
    const inc = val ? Math.round(parseInt(val) * 1.1) : 0
    setForm(f => ({ ...f, price_ex_tax: val, price: val ? String(inc) : '' }))
  }

  return (
    <div className="grid grid-cols-2 gap-3 mt-3">
      <div className="col-span-2">
        <label className="block text-xs text-gray-500 mb-1">メニュー名 *</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="input-field text-sm"
          placeholder="全身もみ60分"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">時間（分）</label>
        <input
          type="number"
          value={form.duration_minutes}
          onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
          className="input-field text-sm"
          placeholder="60"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">カテゴリー</label>
        <input
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          className="input-field text-sm"
          placeholder="全身もみ"
          list="categories"
        />
        <datalist id="categories">
          {categories.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
      {/* 料金：税込・税抜を並べて表示 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">料金（税込）*</label>
        <input
          type="number"
          value={form.price}
          onChange={(e) => handlePriceChange(e.target.value)}
          className="input-field text-sm"
          placeholder="4378"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">料金（税抜）</label>
        <input
          type="number"
          value={form.price_ex_tax}
          onChange={(e) => handleExTaxChange(e.target.value)}
          className="input-field text-sm"
          placeholder="3980"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">表示順</label>
        <input
          type="number"
          value={form.sort_order}
          onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
          className="input-field text-sm"
        />
      </div>
      <div className="flex items-end pb-1">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="active"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            className="w-4 h-4 accent-pink-600"
          />
          <label htmlFor="active" className="text-sm text-gray-700">有効（予約画面に表示）</label>
        </div>
      </div>
    </div>
  )
}

export default function MenuManager({ initialMenus }: Props) {
  const [menus, setMenus] = useState(initialMenus)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const categories = Array.from(new Set(menus.map((m) => m.category || 'その他')))

  const startEdit = (menu: Menu) => {
    setEditing(menu.id)
    setAdding(false)
    setForm({
      name: menu.name,
      duration_minutes: String(menu.duration_minutes),
      price: String(menu.price),
      price_ex_tax: menu.price_ex_tax != null ? String(menu.price_ex_tax) : '',
      category: menu.category || '',
      active: menu.active,
      sort_order: String(menu.sort_order),
    })
  }

  const handleSave = async (id?: string) => {
    setLoading(true)
    const payload = {
      name: form.name,
      duration_minutes: parseInt(form.duration_minutes),
      price: parseInt(form.price),
      price_ex_tax: form.price_ex_tax ? parseInt(form.price_ex_tax) : null,
      category: form.category || null,
      active: form.active,
      sort_order: parseInt(form.sort_order) || 0,
    }

    if (id) {
      const { error } = await supabase.from('menus').update(payload).eq('id', id)
      if (!error) {
        setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, ...payload } : m)))
        setEditing(null)
      }
    } else {
      const { data, error } = await supabase.from('menus').insert(payload).select().single()
      if (!error && data) {
        setMenus((prev) => [...prev, data])
        setAdding(false)
        setForm(emptyForm)
      }
    }
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このメニューを削除しますか？')) return
    const { error } = await supabase.from('menus').delete().eq('id', id)
    if (!error) {
      setMenus((prev) => prev.filter((m) => m.id !== id))
    }
  }

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from('menus').update({ active }).eq('id', id)
    if (!error) {
      setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, active } : m)))
    }
  }

  const groupedMenus = menus.reduce<Record<string, Menu[]>>((acc, menu) => {
    const cat = menu.category || 'その他'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(menu)
    return acc
  }, {})

  return (
    <div>
      {/* 追加ボタン */}
      <div className="mb-4">
        {!adding ? (
          <button
            onClick={() => { setAdding(true); setEditing(null); setForm(emptyForm) }}
            className="btn-primary text-sm"
          >
            + メニューを追加
          </button>
        ) : (
          <div className="card p-4">
            <h3 className="font-medium text-gray-900">新規メニュー</h3>
            <FormFields form={form} setForm={setForm} categories={categories} />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleSave()}
                disabled={loading || !form.name || !form.price}
                className="btn-primary text-sm py-2"
              >
                保存
              </button>
              <button
                onClick={() => { setAdding(false); setForm(emptyForm) }}
                className="btn-secondary text-sm py-2"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* メニュー一覧（カテゴリーグループ） */}
      <div className="space-y-6">
        {Object.entries(groupedMenus).map(([cat, items]) => (
          <div key={cat}>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">{cat}</h2>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">メニュー名</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">時間</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">税込</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">税抜</th>
                    <th className="text-center px-4 py-2 text-xs text-gray-500 font-medium">状態</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((menu) => (
                    <>
                      <tr key={menu.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{menu.name}</td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {menu.duration_minutes > 0 ? `${menu.duration_minutes}分` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-pink-600">
                          {formatPrice(menu.price)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {menu.price_ex_tax != null
                            ? `¥${menu.price_ex_tax.toLocaleString()}`
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleActive(menu.id, !menu.active)}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              menu.active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {menu.active ? '有効' : '無効'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => editing === menu.id ? setEditing(null) : startEdit(menu)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(menu.id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editing === menu.id && (
                        <tr key={`edit-${menu.id}`}>
                          <td colSpan={6} className="px-4 pb-3">
                            <FormFields form={form} setForm={setForm} categories={categories} />
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleSave(menu.id)}
                                disabled={loading || !form.name || !form.price}
                                className="btn-primary text-sm py-2"
                              >
                                更新
                              </button>
                              <button
                                onClick={() => setEditing(null)}
                                className="btn-secondary text-sm py-2"
                              >
                                キャンセル
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
