'use client'

import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'

function LoginForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectTo = searchParams.get('redirectTo') || '/'
  const [loading, setLoading] = useState<'google' | 'apple' | 'email' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading('google')
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(null)
    }
  }

  const handleAppleLogin = async () => {
    setLoading('apple')
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(null)
    }
  }

  const handleEmailLogin = async () => {
    if (!email) return
    setLoading('email')
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(null)
    } else {
      setEmailSent(true)
      setLoading(null)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">メールを送信しました</h2>
            <p className="text-gray-600 text-sm mb-4">
              <strong>{email}</strong> にログインリンクを送信しました。
            </p>
            <p className="text-gray-500 text-sm">
              メールを開いてリンクをクリックするとログインできます。
            </p>
            <button
              onClick={() => setEmailSent(false)}
              className="mt-6 text-pink-600 text-sm hover:underline"
            >
              別のメールアドレスで試す
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl">🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">りらくもみのき</h1>
          <p className="text-gray-500 text-sm mt-1">富士錦町店 オンライン予約</p>
        </div>

        {/* ログインカード */}
        <div className="card p-8">
          <h2 className="text-lg font-bold text-center text-gray-800 mb-2">
            ログイン / 新規登録
          </h2>
          <p className="text-center text-sm text-gray-500 mb-6">
            ご予約にはアカウントが必要です
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {/* メールログイン */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <p className="text-xs text-gray-500 mb-2 font-medium">📧 メールアドレスでログイン</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="input-field text-sm mb-2"
                onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
              />
              <button
                onClick={handleEmailLogin}
                disabled={loading !== null || !email}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60 text-sm"
              >
                {loading === 'email' ? 'メール送信中...' : 'ログインリンクを送信'}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-400">
                <span className="bg-white px-3">または</span>
              </div>
            </div>

            {/* Googleログイン */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-60 shadow-sm"
            >
              {loading === 'google' ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Googleでログイン
            </button>

            {/* Appleログイン */}
            <button
              onClick={handleAppleLogin}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-900 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-60 shadow-sm"
            >
              {loading === 'apple' ? (
                <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              )}
              Appleでログイン
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            ログインすることで
            <a href="#" className="text-pink-600 hover:underline">利用規約</a>
            および
            <a href="#" className="text-pink-600 hover:underline">プライバシーポリシー</a>
            に同意したものとみなします
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ご予約なしでのご来店も歓迎しております
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
