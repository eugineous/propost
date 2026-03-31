'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PlatformConn {
  id: string
  platform: string
  status: string
  last_verified?: string
  expires_at?: string
  scopes?: string[]
  error_message?: string
}

const PLATFORM_DOCS: Record<string, string> = {
  x: 'Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET in Vercel env vars.',
  instagram: 'Set INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID in Vercel env vars.',
  facebook: 'Set FACEBOOK_ACCESS_TOKEN, FACEBOOK_PAGE_ID in Vercel env vars.',
  linkedin: 'Set LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN in Vercel env vars.',
  website: 'Set VERCEL_DEPLOY_HOOK_URL in Vercel env vars.',
}

export default function SettingsPage() {
  const [connections, setConnections] = useState<PlatformConn[]>([])

  useEffect(() => {
    fetch('/api/connections').then((r) => r.json()).then(setConnections).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Empire</Link>
        <h1 className="text-lg font-bold text-white">Settings & Connections</h1>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 font-bold tracking-wider mb-4">PLATFORM CONNECTIONS</div>
            <div className="space-y-4">
              {['x', 'instagram', 'facebook', 'linkedin', 'website'].map((p) => {
                const conn = connections.find((c) => c.platform === p)
                const status = conn?.status ?? 'not configured'
                return (
                  <div key={p} className="border border-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-200 capitalize">{p}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        status === 'connected' ? 'bg-green-900 text-green-400' :
                        status === 'expired' ? 'bg-yellow-900 text-yellow-400' :
                        status === 'error' ? 'bg-red-900 text-red-400' :
                        'bg-gray-800 text-gray-500'
                      }`}>{status}</span>
                    </div>
                    {conn?.last_verified && (
                      <div className="text-xs text-gray-600">Last verified: {new Date(conn.last_verified).toLocaleString()}</div>
                    )}
                    {conn?.expires_at && (
                      <div className="text-xs text-gray-600">Expires: {new Date(conn.expires_at).toLocaleString()}</div>
                    )}
                    {conn?.scopes && conn.scopes.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">Scopes: {conn.scopes.join(', ')}</div>
                    )}
                    {conn?.error_message && (
                      <div className="text-xs text-red-400 mt-1">{conn.error_message}</div>
                    )}
                    <div className="text-xs text-gray-600 mt-2 bg-gray-800 rounded p-2">
                      {PLATFORM_DOCS[p]}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="col-span-4 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 font-bold tracking-wider mb-3">AI PROVIDERS</div>
            <div className="space-y-2">
              {[
                { name: 'Gemini 2.0 Flash', env: 'GEMINI_API_KEY', role: 'Planning, reasoning, strategy' },
                { name: 'NVIDIA NIM', env: 'NVIDIA_API_KEY', role: 'Content generation, drafting' },
              ].map((ai) => (
                <div key={ai.name} className="border border-gray-800 rounded p-2">
                  <div className="text-xs font-bold text-gray-200">{ai.name}</div>
                  <div className="text-xs text-gray-500">{ai.role}</div>
                  <div className="text-xs text-gray-600 mt-1">Env: {ai.env}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 font-bold tracking-wider mb-3">CRON SCHEDULE</div>
            <div className="space-y-2 text-xs text-gray-500">
              <div>AI News: 03:00, 09:00, 15:00, 21:00 UTC</div>
              <div>Analytics: 02:00 UTC daily</div>
              <div>Health: every 5 min</div>
              <div>Content Queue: every 15 min</div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 font-bold tracking-wider mb-3">SECURITY</div>
            <div className="text-xs text-gray-500 space-y-1">
              <div>All credentials stored in Vercel env vars only.</div>
              <div>No raw credential values exposed via API.</div>
              <div>Cron endpoints protected by CRON_SECRET bearer token.</div>
              <div>Webhook signatures verified via HMAC-SHA256.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
