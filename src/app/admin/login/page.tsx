'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminLoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)
  const [mode, setMode] = useState<'password' | 'magic'>('password')

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }
    router.push('/admin')
    router.refresh()
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin`,
      },
    })
    if (error) {
      setError('メール送信に失敗しました')
      setLoading(false)
      return
    }
    setMagicSent(true)
    setLoading(false)
  }

  if (magicSent) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-700 rounded-2xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">メールを送信しました</h2>
          <p className="text-gray-400 text-sm mb-1">{email} にログインリンクを送りました。</p>
          <p className="text-gray-500 text-xs">メールを開いてリンクをクリックしてください。</p>
          <button
            onClick={() => { setMagicSent(false); setEmail('') }}
            className="mt-6 text-gray-400 text-sm hover:text-gray-200 transition-colors"
          >
            ← 戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-700 rounded-2xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">りらくもみのき</h1>
          <p className="text-gray-400 text-sm mt-1">管理画面ログイン</p>
        </div>

        {/* モード切替タブ */}
        <div className="flex bg-gray-800 rounded-xl p-1 mb-4 border border-gray-700">
          <button
            onClick={() => { setMode('password'); setError(null) }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === 'password' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            パスワード
          </button>
          <button
            onClick={() => { setMode('magic'); setError(null) }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === 'magic' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            メールリンク
          </button>
        </div>

        {/* フォーム */}
        <form
          onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink}
          className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700"
        >
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="bit19866@gmail.com"
                required
                autoComplete="email"
                className="w-full bg-gray-900 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>

            {mode === 'password' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-gray-900 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>
            )}

            {mode === 'magic' && (
              <p className="text-xs text-gray-500">
                入力したメールアドレスにログインリンクを送信します。リンクをクリックすると管理画面に入れます。
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || (mode === 'password' && !password)}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {mode === 'magic' ? '送信中...' : 'ログイン中...'}
                </span>
              ) : mode === 'magic' ? 'ログインリンクを送信' : 'ログイン'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
