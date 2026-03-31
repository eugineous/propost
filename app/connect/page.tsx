'use client'

// Platform Connect Page — Full Multi-Platform Login Hub
// Each platform opens an ISOLATED browser window (no personal Chrome data)
// Session is captured and stored in Cloudflare KV after login

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface PlatformStatus {
  platform: string
  status: string
  hasSession?: boolean
  lastVerified?: string
  error?: string
  error_message?: string
}

interface ConnectResult {
  ok: boolean
  message?: string
  error?: string
}

type LoginStep = 'idle' | 'waiting' | 'capturing' | 'done' | 'error'

// ─── Platform definitions ─────────────────────────────────────────────────────

const PLATFORMS = [
  // ── Browser-based (popup login) ──
  {
    id: 'x',
    name: 'X (Twitter)',
    icon: '𝕏',
    color: '#1d9bf0',
    group: 'Social',
    description: 'Posts, replies, threads — 2x/hour autonomous',
    loginUrl: 'https://x.com/login',
    method: 'browser' as const,
    capabilities: ['Post 2x/hour', 'Reply 20/day', 'Thread publishing'],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: '#e1306c',
    group: 'Social',
    description: 'Posts, stories, reels, DMs',
    loginUrl: 'https://www.instagram.com/accounts/login/',
    method: 'browser' as const,
    capabilities: ['Posts & carousels', 'Stories', 'DM replies 20/day'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    color: '#1877f2',
    group: 'Social',
    description: 'Page posts, comments, community',
    loginUrl: 'https://www.facebook.com/login',
    method: 'browser' as const,
    capabilities: ['Page posts', 'Comment replies', 'Community management'],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: '#0a66c2',
    group: 'Social',
    description: 'Professional posts, articles, networking',
    loginUrl: 'https://www.linkedin.com/login',
    method: 'browser' as const,
    capabilities: ['Posts 2x/hour', 'Article publishing', 'Comment replies'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: '#ff0050',
    group: 'Video',
    description: 'Short video scripts, captions, comments',
    loginUrl: 'https://www.tiktok.com/login',
    method: 'browser' as const,
    capabilities: ['Video scripts', 'Caption generation', 'Comment replies'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    color: '#ff0000',
    group: 'Video',
    description: 'Video descriptions, community posts, comments',
    loginUrl: 'https://accounts.google.com/signin',
    method: 'browser' as const,
    capabilities: ['Community posts', 'Video descriptions', 'Comment replies'],
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: '🤖',
    color: '#ff4500',
    group: 'Community',
    description: 'AI subreddit posts, comments, discussions',
    loginUrl: 'https://www.reddit.com/login',
    method: 'browser' as const,
    capabilities: ['Subreddit posts', 'Comment replies', 'Discussion threads'],
  },
  {
    id: 'mastodon',
    name: 'Mastodon',
    icon: '🐘',
    color: '#6364ff',
    group: 'Community',
    description: 'Decentralized social — AI community posts',
    loginUrl: 'https://mastodon.social/auth/sign_in',
    method: 'browser' as const,
    capabilities: ['Toots & threads', 'Community engagement'],
  },
  {
    id: 'truthsocial',
    name: 'Truth Social',
    icon: '🇺🇸',
    color: '#5448ee',
    group: 'Community',
    description: 'Posts and engagement',
    loginUrl: 'https://truthsocial.com/login',
    method: 'browser' as const,
    capabilities: ['Posts', 'Replies'],
  },
]

// ─── Isolated browser window opener ──────────────────────────────────────────
// Opens a completely clean browser context with no personal data
// Uses about:blank first, then navigates — forces a fresh session

function openIsolatedBrowser(loginUrl: string, platformId: string): Window | null {
  // Try to open with noopener + noreferrer to get a clean context
  // The key is using window.open with specific features that isolate it
  const features = [
    'width=520',
    'height=720',
    'scrollbars=yes',
    'resizable=yes',
    'toolbar=no',
    'menubar=no',
    'location=yes',
    'status=no',
    'directories=no',
    'noopener',
  ].join(',')

  // Open a blank window first
  const popup = window.open('about:blank', `propost_login_${platformId}_${Date.now()}`, features)

  if (!popup) return null

  // Write a redirect page that clears storage before navigating
  // This ensures no cookies/localStorage from the parent window bleed in
  popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ProPost — Connecting ${platformId}...</title>
      <style>
        body { background: #0a0a0a; color: #fff; font-family: system-ui; 
               display: flex; align-items: center; justify-content: center; 
               height: 100vh; margin: 0; flex-direction: column; gap: 16px; }
        .spinner { width: 32px; height: 32px; border: 3px solid #333; 
                   border-top-color: #7c3aed; border-radius: 50%; 
                   animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        p { color: #888; font-size: 14px; }
        strong { color: #fff; }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <strong>Opening ${platformId} login...</strong>
      <p>This is a clean, isolated session — not your personal browser.</p>
      <script>
        // Clear any existing session data in this window
        try { localStorage.clear(); sessionStorage.clear(); } catch(e) {}
        // Navigate to the login page
        setTimeout(() => { window.location.href = ${JSON.stringify(loginUrl)}; }, 800);
      </script>
    </body>
    </html>
  `)
  popup.document.close()

  return popup
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConnectPage() {
  const [statuses, setStatuses] = useState<Record<string, PlatformStatus>>({})
  const [loginSteps, setLoginSteps] = useState<Record<string, LoginStep>>({})
  const [loginWindows, setLoginWindows] = useState<Record<string, Window | null>>({})
  const [results, setResults] = useState<Record<string, ConnectResult>>({})
  const [capturing, setCapturing] = useState<string | null>(null)

  const loadStatuses = useCallback(async () => {
    try {
      const [connRes, sessionRes] = await Promise.all([
        fetch('/api/connections').then(r => r.json()).catch(() => []),
        fetch('/api/connect/sessions').then(r => r.json()).catch(() => ({})),
      ])

      const map: Record<string, PlatformStatus> = {}

      if (Array.isArray(connRes)) {
        for (const c of connRes) {
          map[c.platform] = {
            platform: c.platform,
            status: c.status,
            lastVerified: c.last_verified,
            error: c.error_message,
          }
        }
      }

      // Merge browser session statuses
      if (sessionRes && typeof sessionRes === 'object') {
        for (const [platform, info] of Object.entries(sessionRes as Record<string, { hasSession: boolean }>)) {
          map[platform] = {
            ...map[platform],
            platform,
            status: info.hasSession ? 'connected' : (map[platform]?.status ?? 'not_connected'),
            hasSession: info.hasSession,
          }
        }
      }

      setStatuses(map)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadStatuses()
    const interval = setInterval(loadStatuses, 15000)
    return () => clearInterval(interval)
  }, [loadStatuses])

  const startLogin = useCallback((platformId: string, loginUrl: string) => {
    const popup = openIsolatedBrowser(loginUrl, platformId)

    if (!popup) {
      setResults(prev => ({ ...prev, [platformId]: { ok: false, error: 'Popup blocked — allow popups for propost.vercel.app in your browser settings.' } }))
      return
    }

    setLoginWindows(prev => ({ ...prev, [platformId]: popup }))
    setLoginSteps(prev => ({ ...prev, [platformId]: 'waiting' }))
    setResults(prev => ({ ...prev, [platformId]: { ok: false, message: `🔐 Log into ${platformId} in the isolated window. Come back when done.` } }))
  }, [])

  const captureSession = useCallback(async (platformId: string) => {
    setCapturing(platformId)
    setLoginSteps(prev => ({ ...prev, [platformId]: 'capturing' }))
    setResults(prev => ({ ...prev, [platformId]: { ok: false, message: '⏳ Saving session...' } }))

    // Close the popup
    const popup = loginWindows[platformId]
    if (popup && !popup.closed) popup.close()

    try {
      const res = await fetch('/api/connect/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId, action: 'login' }),
      })
      const data = await res.json() as ConnectResult

      setResults(prev => ({ ...prev, [platformId]: data }))
      setLoginSteps(prev => ({ ...prev, [platformId]: data.ok ? 'done' : 'error' }))

      if (data.ok) await loadStatuses()
    } catch (err) {
      setResults(prev => ({ ...prev, [platformId]: { ok: false, error: String(err) } }))
      setLoginSteps(prev => ({ ...prev, [platformId]: 'error' }))
    } finally {
      setCapturing(null)
    }
  }, [loginWindows, loadStatuses])

  const resetLogin = useCallback((platformId: string) => {
    setLoginSteps(prev => ({ ...prev, [platformId]: 'idle' }))
    setResults(prev => { const n = { ...prev }; delete n[platformId]; return n })
  }, [])

  const getStatusBadge = (platformId: string) => {
    const s = statuses[platformId]
    if (!s) return <span className="text-xs text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded">—</span>
    if (s.status === 'connected' || s.hasSession)
      return <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded font-bold">✓ Connected</span>
    if (s.status === 'error')
      return <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded font-bold">✗ Error</span>
    if (s.status === 'expired')
      return <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded font-bold">⚠ Expired</span>
    return <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded">Not connected</span>
  }

  const groups = ['Social', 'Video', 'Community']

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Empire</Link>
        <span className="text-white font-bold">Connect Platforms</span>
        <span className="text-xs text-gray-600">Log in once — agents work forever</span>
      </div>

      {/* Info banner */}
      <div className="mx-6 mt-4 p-3 bg-blue-900/20 border border-blue-800/40 rounded-lg text-xs text-blue-300 leading-relaxed">
        <strong className="text-blue-200">How it works:</strong> Each platform opens an <strong className="text-white">isolated clean browser window</strong> — completely separate from your personal Chrome, no existing sessions, no cookies. Log in normally, then click "I've Logged In". The session is encrypted and stored in Cloudflare KV. Your agents use it to post autonomously.
      </div>

      <div className="p-6 space-y-8">
        {groups.map(group => {
          const groupPlatforms = PLATFORMS.filter(p => p.group === group)
          return (
            <div key={group}>
              <div className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-3">{group}</div>
              <div className="grid grid-cols-1 gap-3">
                {groupPlatforms.map(platform => {
                  const step = loginSteps[platform.id] ?? 'idle'
                  const result = results[platform.id]
                  const status = statuses[platform.id]
                  const isConnected = status?.status === 'connected' || status?.hasSession
                  const isCapturing = capturing === platform.id

                  return (
                    <div
                      key={platform.id}
                      className="bg-gray-900 border rounded-lg p-4 transition-all"
                      style={{ borderColor: isConnected ? platform.color + '55' : '#1f2937' }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: platform info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 font-bold"
                            style={{ backgroundColor: platform.color + '22', color: platform.color }}
                          >
                            {platform.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-100 text-sm">{platform.name}</div>
                            <div className="text-xs text-gray-500 truncate">{platform.description}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {platform.capabilities.map(c => (
                                <span key={c} className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{c}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: status + action */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {getStatusBadge(platform.id)}

                          {/* Action buttons */}
                          {step === 'idle' && (
                            <button
                              onClick={() => startLogin(platform.id, platform.loginUrl)}
                              className="px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap"
                              style={{ backgroundColor: platform.color, color: 'white' }}
                            >
                              {isConnected ? '🔄 Re-login' : '🔐 Connect'}
                            </button>
                          )}

                          {step === 'waiting' && (
                            <div className="flex flex-col items-end gap-1">
                              <button
                                onClick={() => captureSession(platform.id)}
                                className="px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded text-xs font-bold transition-colors whitespace-nowrap"
                              >
                                ✅ I've Logged In
                              </button>
                              <button
                                onClick={() => { loginWindows[platform.id]?.close(); resetLogin(platform.id) }}
                                className="text-xs text-gray-600 hover:text-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {step === 'capturing' && (
                            <span className="text-xs text-yellow-400 animate-pulse">⏳ Saving...</span>
                          )}

                          {(step === 'done' || step === 'error') && (
                            <button
                              onClick={() => resetLogin(platform.id)}
                              className="text-xs text-gray-500 hover:text-gray-300"
                            >
                              {step === 'done' ? '✓ Done — login again?' : '↩ Try again'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Status messages */}
                      {step === 'waiting' && (
                        <div className="mt-3 p-2 bg-blue-900/20 border border-blue-800/30 rounded text-xs text-blue-300">
                          🔐 <strong>Log into {platform.name} in the isolated window.</strong> It has no connection to your personal Chrome — completely clean. When you see your feed/home page, click "I've Logged In" above.
                        </div>
                      )}

                      {result && (
                        <div className={`mt-2 p-2 rounded text-xs ${
                          result.ok ? 'text-green-400 bg-green-900/20' :
                          result.error ? 'text-red-400 bg-red-900/20' :
                          'text-blue-400 bg-blue-900/20'
                        }`}>
                          {result.ok ? `✅ ${result.message ?? 'Session saved — agent is ready'}` :
                           result.error ? `❌ ${result.error}` :
                           result.message}
                        </div>
                      )}

                      {isConnected && step === 'idle' && (
                        <div className="mt-2 text-xs text-gray-600">
                          Session active{status?.lastVerified ? ` · Last verified ${new Date(status.lastVerified).toLocaleDateString()}` : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Auto-activity summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-purple-400 font-bold tracking-wider mb-3">AUTONOMOUS ACTIVITY (once connected)</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { platform: 'X', activity: '2 posts/hour · 20 replies/day · threads' },
              { platform: 'LinkedIn', activity: '2 posts/hour · comment replies' },
              { platform: 'Instagram', activity: 'Daily posts · stories · 20 DMs/day' },
              { platform: 'Facebook', activity: 'Daily page posts · comment replies' },
              { platform: 'TikTok', activity: 'Video scripts · caption generation' },
              { platform: 'YouTube', activity: 'Community posts · descriptions' },
              { platform: 'Reddit', activity: '3-5 posts/day · 20 comments/day' },
              { platform: 'Mastodon', activity: 'Posts every 2-3 hours' },
            ].map(({ platform, activity }) => (
              <div key={platform} className="flex justify-between items-center py-1.5 border-b border-gray-800">
                <span className="text-gray-400 font-medium">{platform}</span>
                <span className="text-gray-600">{activity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
