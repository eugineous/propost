'use client'

import { signIn, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/')
    }
  }, [status, session, router])

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('google', {
        callbackUrl: '/',
        redirect: true,
      })
    } catch {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-pp-bg flex items-center justify-center">
        <div className="pixel-text text-pp-gold" style={{ fontSize: 10 }}>
          LOADING...
        </div>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-pp-bg flex items-center justify-center">
        <div className="pixel-text text-pp-gold" style={{ fontSize: 10 }}>
          REDIRECTING...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pp-bg flex items-center justify-center">
      <div
        className="pixel-card p-8 max-w-sm w-full text-center space-y-6"
        style={{ background: '#12121F', border: '2px solid #1E1E3A' }}
      >
        {/* Logo */}
        <div className="space-y-2">
          <div className="pixel-text text-pp-gold" style={{ fontSize: 14 }}>
            PROPOST
          </div>
          <div className="pixel-text text-pp-accent" style={{ fontSize: 8 }}>
            EMPIRE
          </div>
        </div>

        <div className="text-pp-muted" style={{ fontSize: 9 }}>
          Autonomous Social Media Command Center
        </div>

        {/* Error display */}
        {error && (
          <div
            className="px-3 py-2 rounded text-pp-danger"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #EF4444', fontSize: 8 }}
          >
            {error === 'OAuthCallback'
              ? 'OAuth callback error. Check Google Console redirect URIs.'
              : error === 'AccessDenied'
              ? 'Access denied. Only euginemicah@gmail.com can sign in.'
              : error === 'Callback'
              ? 'Callback error — ensure redirect URI is set in Google Console.'
              : `Auth error: ${error}`}
          </div>
        )}

        {/* Sign in button */}
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
          {loading ? 'SIGNING IN...' : '🔐 SIGN IN WITH GOOGLE'}
        </button>

        <div className="text-pp-muted" style={{ fontSize: 8 }}>
          👑 Eugine Micah access only
        </div>

        {/* Debug info — shows the callback URL being used */}
        <div
          className="text-pp-muted text-left rounded p-2"
          style={{ background: '#0A0A14', fontSize: 7, fontFamily: 'monospace' }}
        >
          <div>Callback URL:</div>
          <div className="text-pp-accent break-all">
            {typeof window !== 'undefined'
              ? `${window.location.origin}/api/auth/callback/google`
              : '/api/auth/callback/google'}
          </div>
          <div className="mt-1">Add this to Google Cloud Console →</div>
          <div>OAuth 2.0 Client → Authorized redirect URIs</div>
        </div>
      </div>
    </div>
  )
}
