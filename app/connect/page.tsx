'use client'

// Platform Connect Page
// Lets the founder log into each platform via a real browser popup.
// After login, the session is captured and stored in Cloudflare KV.
// The system then uses that session for all browser-based automation.

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface PlatformStatus {
  platform: string
  status: string
  hasSession?: boolean
  browserEnabled?: boolean
  lastVerified?: string
  error?: string
  error_message?: string
}

interface ConnectResult {
  ok: boolean
  message?: string
  error?: string
  url?: string
}

const PLATFORM_CONFIG = [
  {
    id: 'x',
    name: 'X (Twitter)',
    icon: '🐦',
    color: '#1d9bf0',
    description: 'Browser login — posts, replies, threads',
    loginUrl: 'https://x.com/login',
    method: 'browser',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: '#e1306c',
    description: 'Meta API — posts, stories, DMs',
    loginUrl: null,
    method: 'api',
    envVars: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    color: '#1877f2',
    description: 'Meta API — page posts, comments',
    loginUrl: null,
    method: 'api',
    envVars: ['FACEBOOK_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID'],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: '#0a66c2',
    description: 'LinkedIn API — posts, comments',
    loginUrl: null,
    method: 'api',
    envVars: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_PERSON_URN'],
  },
]

export default function ConnectPage() {
  const [statuses, setStatuses] = useState<Record<string, PlatformStatus>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, ConnectResult>>({})
  const [xLoginStep, setXLoginStep] = useState<'idle' | 'waiting' | 'capturing' | 'done'>('idle')
  const [xLoginWindow, setXLoginWindow] = useState<Window | null>(null)

  const loadStatuses = useCallback(async () => {
    try {
      const [connRes, xRes] = await Promise.all([
        fetch('/api/connections').then(r => r.json()).catch(() => []),
        fetch('/api/connect/x').then(r => r.json()).catch(() => ({})),
      ])

      const map: Record<string, PlatformStatus> = {}

      if (Array.isArray(connRes)) {
        for (const c of connRes) {
          map[c.platform] = { platform: c.platform, status: c.status, lastVerified: c.last_verified, error: c.error_message }
        }
      }

      // Merge X browser session status
      if (xRes) {
        map['x'] = {
          ...map['x'],
          platform: 'x',
          status: xRes.hasSession ? 'connected' : (map['x']?.status ?? 'not_configured'),
          hasSession: xRes.hasSession,
          browserEnabled: xRes.browserEnabled,
        }
      }

      setStatuses(map)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadStatuses()
    const interval = setInterval(loadStatuses, 10000)
    return () => clearInterval(interval)
  }, [loadStatuses])

  // X Browser Login Flow
  const startXLogin = useCallback(() => {
    setXLoginStep('waiting')
    setResults(prev => ({ ...prev, x: { ok: false, message: 'Opening X login...' } }))

    // Open X login in a popup window
    const popup = window.open(
      'https://x.com/login',
      'x_login',
      'width=500,height=700,scrollbars=yes,resizable=yes'
    )

    if (!popup) {
      setResults(prev => ({ ...prev, x: { ok: false, error: 'Popup blocked. Allow popups for this site.' } }))
      setXLoginStep('idle')
      return
    }

    setXLoginWindow(popup)
    setResults(prev => ({ ...prev, x: { ok: false, message: '🔐 Log into X in the popup window. Come back here when done.' } }))
  }, [])

  const captureXSession = useCallback(async () => {
    setXLoginStep('capturing')
    setLoading('x')
    setResults(prev => ({ ...prev, x: { ok: false, message: '⏳ Capturing session...' } }))

    try {
      // Close the popup if still open
      if (xLoginWindow && !xLoginWindow.closed) {
        xLoginWindow.close()
      }

      // Trigger the browser poster to log in using stored credentials
      const res = await fetch('/api/connect/x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login' }),
      })

      const data = await res.json() as ConnectResult
      setResults(prev => ({ ...prev, x: data }))
      setXLoginStep('done')

      if (data.ok) {
        await loadStatuses()
      }
    } catch (err) {
      setResults(prev => ({ ...prev, x: { ok: false, error: String(err) } }))
      setXLoginStep('idle')
    } finally {
      setLoading(null)
    }
  }, [xLoginWindow, loadStatuses])

  const getStatusBadge = (platform: string) => {
    const s = statuses[platform]
    if (!s) return <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">checking...</span>

    const isConnected = s.status === 'connected' || s.hasSession
    const isError = s.status === 'error'
    const isExpired = s.status === 'expired'

    if (isConnected) return <span className="text-xs text-green-400 bg-green-900/40 px-2 py-0.5 rounded font-bold">✓ Connected</span>
    if (isError) return <span className="text-xs text-red-400 bg-red-900/40 px-2 py-0.5 rounded font-bold">✗ Error</span>
    if (isExpired) return <span className="text-xs text-yellow-400 bg-yellow-900/40 px-2 py-0.5 rounded font-bold">⚠ Expired</span>
    return <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Not connected</span>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Empire</Link>
        <h1 className="text-lg font-bold text-white">Connect Platforms</h1>
        <span className="text-xs text-gray-600">Log in once — agents work forever</span>
      </div>

      <div className="max-w-2xl space-y-4">
        {PLATFORM_CONFIG.map((platform) => {
          const result = results[platform.id]
          const status = statuses[platform.id]
          const isConnected = status?.status === 'connected' || status?.hasSession

          return (
            <div
              key={platform.id}
              className="bg-gray-900 border rounded-lg p-5"
              style={{ borderColor: isConnected ? platform.color + '66' : '#374151' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <div className="font-bold text-gray-100">{platform.name}</div>
                    <div className="text-xs text-gray-500">{platform.description}</div>
                  </div>
                </div>
                {getStatusBadge(platform.id)}
              </div>

              {/* X — Browser Login */}
              {platform.id === 'x' && (
                <div className="space-y-3">
                  {!isConnected && (
                    <div className="text-xs text-gray-400 bg-gray-800 rounded p-3 leading-relaxed">
                      <strong className="text-gray-200">How it works:</strong> Click "Open X Login" below.
                      A popup opens with X's real login page. Log in normally with your account.
                      When done, click "I've Logged In" — the system captures your session and stores it securely.
                      Your session lasts 30 days and auto-renews on every post.
                    </div>
                  )}

                  {isConnected && (
                    <div className="text-xs text-green-400 bg-green-900/20 rounded p-3">
                      ✓ Session active — BLAZE can post to X using browser automation.
                      {status?.lastVerified && ` Last verified: ${new Date(status.lastVerified).toLocaleString()}`}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {xLoginStep === 'idle' && (
                      <button
                        onClick={startXLogin}
                        className="px-4 py-2 rounded text-sm font-bold transition-colors"
                        style={{ backgroundColor: '#1d9bf0', color: 'white' }}
                      >
                        {isConnected ? '🔄 Re-login to X' : '🔐 Open X Login'}
                      </button>
                    )}

                    {xLoginStep === 'waiting' && (
                      <>
                        <div className="text-xs text-blue-400 bg-blue-900/20 rounded p-3 flex-1">
                          🔐 <strong>Log into X in the popup window.</strong> Use your real X username and password.
                          When you see your X home feed, come back here and click the button below.
                        </div>
                        <div className="flex gap-2 w-full mt-2">
                          <button
                            onClick={captureXSession}
                            className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-sm font-bold transition-colors"
                          >
                            ✅ I've Logged In — Capture Session
                          </button>
                          <button
                            onClick={() => { xLoginWindow?.close(); setXLoginStep('idle'); setResults(prev => ({ ...prev, x: { ok: false } })) }}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}

                    {xLoginStep === 'capturing' && (
                      <div className="text-xs text-yellow-400 bg-yellow-900/20 rounded p-3 flex-1">
                        ⏳ Capturing session via browser automation... this takes 30-60 seconds.
                      </div>
                    )}

                    {xLoginStep === 'done' && (
                      <button
                        onClick={() => setXLoginStep('idle')}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                      >
                        Login Again
                      </button>
                    )}
                  </div>

                  {result && (
                    <div className={`text-xs rounded p-2 ${result.ok ? 'text-green-400 bg-green-900/20' : result.error ? 'text-red-400 bg-red-900/20' : 'text-blue-400 bg-blue-900/20'}`}>
                      {result.ok ? `✅ ${result.message ?? 'Connected'}` : result.error ? `❌ ${result.error}` : result.message}
                    </div>
                  )}
                </div>
              )}

              {/* API-based platforms */}
              {platform.method === 'api' && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 bg-gray-800 rounded p-3">
                    <strong className="text-gray-300">Required env vars in Vercel:</strong>
                    <div className="mt-1 space-y-0.5">
                      {platform.envVars?.map(v => (
                        <div key={v} className="font-mono text-gray-400">{v}</div>
                      ))}
                    </div>
                    <div className="mt-2 text-gray-600">
                      Add these at{' '}
                      <a href="https://vercel.com/roylandz-media/propost/settings/environment-variables" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                        Vercel → Settings → Environment Variables
                      </a>
                    </div>
                  </div>
                  {status?.error_message && (
                    <div className="text-xs text-red-400">{status.error_message}</div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Auto-reply settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <div className="text-xs text-purple-400 font-bold tracking-wider mb-3">AUTO-REPLY SETTINGS</div>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span>X replies per day</span>
              <span className="text-green-400 font-bold">20 replies</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span>Instagram DM replies per day</span>
              <span className="text-green-400 font-bold">20 DMs</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span>Reply timing</span>
              <span className="text-gray-300">Randomized, human-like delays</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>Tone</span>
              <span className="text-gray-300">Eugine's voice — warm, sharp, culturally grounded</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
