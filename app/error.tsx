'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ProPost] Global error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="bg-gray-900 border border-red-800 rounded-lg p-8 max-w-lg w-full">
        <div className="text-red-400 text-sm font-bold tracking-wider mb-2">SYSTEM ERROR</div>
        <div className="text-white text-lg font-bold mb-3">ProPost encountered an error</div>
        <div className="text-gray-400 text-xs mb-4 font-mono bg-gray-800 rounded p-3 break-all">
          {error.message || 'Unknown error'}
          {error.digest && <div className="text-gray-600 mt-1">Digest: {error.digest}</div>}
        </div>
        <button
          onClick={reset}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm font-bold"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
