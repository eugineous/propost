'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'

const ENV_VARS = [
  { group: 'AI', vars: ['GEMINI_API_KEY', 'NVIDIA_API_KEY', 'NVIDIA_BASE_URL'] },
  { group: 'X / Twitter', vars: ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_BEARER_TOKEN'] },
  { group: 'Instagram / Facebook', vars: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID', 'FACEBOOK_PAGE_ID', 'FACEBOOK_ACCESS_TOKEN'] },
  { group: 'LinkedIn', vars: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_ACCESS_TOKEN'] },
  { group: 'Database', vars: ['DATABASE_URL'] },
  { group: 'Cloudflare', vars: ['CF_ACCOUNT_ID', 'CF_KV_AGENT_STATE_ID', 'CF_API_TOKEN'] },
  { group: 'Auth', vars: ['NEXTAUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] },
  { group: 'Security', vars: ['CRON_SECRET', 'INTERNAL_SECRET'] },
  { group: 'Gmail', vars: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'EUGINE_EMAIL'] },
]

export default function SettingsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0A0A14', color: '#E2E8F0' }}>
      <nav className="flex items-center justify-between px-6 py-3 border-b border-pp-border" style={{ background: '#12121F' }}>
        <div className="flex items-center gap-6">
          <Link href="/" className="pixel-text text-pp-gold" style={{ fontSize: 10 }}>← PROPOST EMPIRE</Link>
          <span className="pixel-text text-pp-accent" style={{ fontSize: 9 }}>SETTINGS</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="pixel-text text-pp-danger hover:opacity-80 transition-opacity"
          style={{ fontSize: 8 }}
        >
          SIGN OUT
        </button>
      </nav>

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="pixel-card p-4">
          <h2 className="pixel-text text-pp-gold mb-2" style={{ fontSize: 9 }}>ENVIRONMENT VARIABLES</h2>
          <p className="text-pp-muted mb-4" style={{ fontSize: 9 }}>
            Configure these in your <code className="text-pp-accent">.env.local</code> file or Vercel project settings.
            See <code className="text-pp-accent">docs/env-setup.md</code> for full setup guide.
          </p>
          <div className="space-y-4">
            {ENV_VARS.map(({ group, vars }) => (
              <div key={group}>
                <div className="pixel-text text-pp-accent mb-2" style={{ fontSize: 7 }}>{group}</div>
                <div className="space-y-1 pl-2">
                  {vars.map((v) => (
                    <div key={v} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-pp-border flex-shrink-0" />
                      <code className="text-pp-text font-mono" style={{ fontSize: 9 }}>{v}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pixel-card p-4">
          <h2 className="pixel-text text-pp-gold mb-2" style={{ fontSize: 9 }}>SYSTEM INFO</h2>
          <div className="space-y-1">
            {[
              ['Version', '1.0.0'],
              ['AI Engine', 'Gemini 2.5 Pro + NVIDIA NIM'],
              ['Agents', '31 across 6 corps'],
              ['Database', 'Neon Postgres'],
              ['Edge Cache', 'Cloudflare KV'],
              ['Hosting', 'Vercel'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-pp-muted" style={{ fontSize: 9 }}>{k}</span>
                <span className="font-mono text-pp-text" style={{ fontSize: 9 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
