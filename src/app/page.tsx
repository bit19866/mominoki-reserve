export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-2xl mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">りらくもみのき</h1>
        <p className="text-gray-400 text-sm mb-1">富士錦町店</p>
        <p className="text-gray-500 text-xs mt-6">オンライン予約は準備中です</p>
        <p className="text-gray-600 text-xs mt-1">Coming Soon</p>
      </div>
    </div>
  )
}
