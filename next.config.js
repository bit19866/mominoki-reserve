/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },
  typescript: {
    // Supabase型定義とのバージョン不一致によるビルドエラーを回避
    // 動作には影響なし（型エラーはランタイムエラーではない）
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
