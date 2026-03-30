'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface ConnectionStatus {
  platform: string
  connected: boolean
  platformUsername?: string
  expiresAt?: string
  daysUntilExpiry?: number | null
  scope?: string
  lastUpdated?: string
}

const PLATFORM_CONFIG: Record<string, { name: string; icon: string; color: string; description: string }> = {
  instagram: { name: 'Instagram',  icon: '📸', color: '#E1306C', description: 'Post photos, reels, reply to DMs and comments' },
  facebook:  { name: 'Facebook',   icon: '👥', color: '#1877F2', description: 'Post to your Facebook Page, boost content' },
  linkedin:  { name: 'LinkedIn',   icon: '💼', color: '#0077B5', description: 'Publish thought leadership posts and articles' },
  x:         { name: 'X / Twitter',icon: '⚡', color: '#1DA1F2', description: 'Post tweets, reply to mentions, track trends' },
  tiktok:    { name: 'TikTok',     icon: '🎵', color: '#FF0050', description: 'Upload and schedule video content' },
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const connectedPlatform = searchParams.get('connected')
  const errorParam        = searchParams.get('error')

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/connections')
      const data = await res.json() as ConnectionStatus[]
      setConnections(data)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConnections() }, [])

  const disconnect = async (platform: string) => {
    setDisconnecting(platform)
    try {
      await fetch(`/api/connections/${platform}`, { method: 'DELETE' })
      await fetchConnections()
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A14', color: '#E2E8F0' }}>
      <nav className="flex items-center gap-6 px-6 py-3 border-b border-pp-border" style={{ background: '#12121F' }}>
        <Link href="/settings" className="pixel-text text-pp-muted hover:text-pp-gold" style={{ fontSize: 9 }}>← SETTINGS</Link>
        <span className="pixel-text text-pp-accent" style={{ fontSize: 9 }}>🔗 PLATFORM CONNECTIONS</span>
      </nav>

      <div className="p-6 max-w-2xl mx-auto">

        {/* Success / error banners */}
        {connectedPlatform && (
          <div className="mb-4 p-3 rounded pixel-text" style={{ fontSize: 8, background: '#22C55E22', border: '1px solid #22C55E44', color: '#22C55E' }}>
            ✅ {PLATFORM_CONFIG[connectedPlatform]?.name ?? connectedPlatform} connected successfully!
          </div>
        )}
        {errorParam && (
          <div className="mb-4 p-3 rounded pixel-text" style={{ fontSize: 8, background: '#EF444422', border: '1px solid #EF444444', color: '#EF4444' }}>
            ❌ Connection failed: {errorParam.replace(/_/g, ' ')}. Please try again.
          </div>
        )}

        <div className="mb-6">
          <h1 className="pixel-text text-pp-gold mb-1" style={{ fontSize: 11 }}>PLATFORM CONNECTIONS</h1>
          <p className="text-pp-muted" style={{ fontSize: 8 }}>
            Connect your social media accounts. Click Connect → log in → done. No API keys needed.
          </p>
        </div>

        {loading ? (
          <div className="pixel-text text-pp-muted text-center py-12" style={{ fontSize: 8 }}>Loading connections...</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(PLATFORM_CONFIG).map(([platform, cfg]) => {
              const conn = connections.find((c: ConnectionStatus) => c.platform === platform)
              const isConnected = conn?.connected ?? false
              const isExpiringSoon = isConnected && conn?.daysUntilExpiry != null && conn.daysUntilExpiry <= 7

              return (
                <div
                  key={platform}
                  className="p-4 rounded-lg"
                  style={{
                    background: '#12121F',
                    border: `1px solid ${isConnected ? cfg.color + '44' : '#1E1E3A'}`,
                    boxShadow: isConnected ? `0 0 8px ${cfg.color}11` : 'none',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                      <div>
                        <div className="font-mono font-bold" style={{ fontSize: 10, color: cfg.color }}>
                          {cfg.name}
                          {isExpiringSoon && (
                            <span className="ml-2 px-1 rounded" style={{ fontSize: 7, background: '#F59E0B22', color: '#F59E0B', border: '1px solid #F59E0B44' }}>
                              ⚠ EXPIRES SOON
                            </span>
                          )}
                        </div>
                        <div className="text-pp-muted" style={{ fontSize: 8 }}>{cfg.description}</div>
                        {isConnected && conn?.platformUsername && (
                          <div className="mt-1 font-mono" style={{ fontSize: 8, color: '#22C55E' }}>
                            ✓ Connected as {conn.platformUsername}
                            {conn.daysUntilExpiry != null && (
                              <span className="ml-2 text-pp-muted">· expires in {conn.daysUntilExpiry}d</span>
                            )}
                          </div>
                        )}
                        {isConnected && !conn?.platformUsername && (
                          <div className="mt-1 font-mono" style={{ fontSize: 8, color: '#22C55E' }}>✓ Connected</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <>
                          <a
                            href={`/api/auth/connect/${platform}`}
                            className="px-3 py-1 rounded pixel-text"
                            style={{ fontSize: 7, background: '#1E1E3A', color: '#64748B', border: '1px solid #1E1E3A' }}
                          >
                            Reconnect
                          </a>
                          <button
                            onClick={() => disconnect(platform)}
                            disabled={disconnecting === platform}
                            className="px-3 py-1 rounded pixel-text"
                            style={{ fontSize: 7, background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444', opacity: disconnecting === platform ? 0.5 : 1 }}
                          >
                            {disconnecting === platform ? 'Disconnecting...' : 'Disconnect'}
                          </button>
                        </>
                      ) : (
                        <a
                          href={`/api/auth/connect/${platform}`}
                          className="px-4 py-2 rounded pixel-text font-bold"
                          style={{ fontSize: 8, background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44` }}
                        >
                          Connect →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 p-3 rounded" style={{ background: '#12121F', border: '1px solid #1E1E3A' }}>
          <div className="pixel-text text-pp-muted mb-1" style={{ fontSize: 7 }}>HOW IT WORKS</div>
          <div className="text-pp-muted" style={{ fontSize: 8, lineHeight: 1.6 }}>
            Click Connect → you&apos;re redirected to the platform&apos;s official login page → you approve access → you&apos;re brought back here.
            Your password never touches ProPost. Tokens are stored securely and auto-refreshed before they expire.
          </div>
        </div>
      </div>
    </div>
  )
}
