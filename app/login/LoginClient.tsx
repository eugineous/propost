'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function LoginClient() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    // redirect: true (default) — NextAuth handles the full OAuth flow
    // and redirects to callbackUrl after success
    signIn('google', { callbackUrl: '/' })
  }

  const errorMessage = error === 'OAuthCallback'
    ? 'OAuth callback error. Check Google Console redirect URIs.'
    : error === 'AccessDenied'
    ? 'Access denied. Only euginemicah@gmail.com can sign in.'
    : error === 'Callback'
    ? 'Callback error — ensure redirect URI is set in Google Console.'
    : error
    ? `Auth error: ${error}`
    : null

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A14' }}>
      <div
        className="p-8 max-w-sm w-full text-center space-y-6"
        style={{ background: '#12121F', border: '2px solid #1E1E3A', borderRadius: 4 }}
      >
        <div className="space-y-2">
          <div className="pixel-text text-pp-gold" style={{ fontSize: 14 }}>PROPOST</div>
          <div className="pixel-text text-pp-accent" style={{ fontSize: 8 }}>EMPIRE</div>
        </div>

        <div className="text-pp-muted" style={{ fontSize: 9 }}>
          Autonomous Social Media Command Center
        </div>

        {errorMessage && (
          <div
            className="px-3 py-2 rounded"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid #EF4444',
              color: '#EF4444',
              fontSize: 8,
            }}
          >
            {errorMessage}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full py-3 px-6 pixel-text transition-opacity disabled:opacity-50"
          style={{
            background: '#FFD700',
            color: '#0A0A14',
            fontSize: 9,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'REDIRECTING TO GOOGLE...' : '🔐 SIGN IN WITH GOOGLE'}
        </button>

        <div className="text-pp-muted" style={{ fontSize: 8 }}>
          👑 Eugine Micah access only
        </div>
      </div>
    </div>
  )
}
