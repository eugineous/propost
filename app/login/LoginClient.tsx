'use client'

import { signIn, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginClient() {
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A14' }}>
        <div className="pixel-text text-pp-gold" style={{ fontSize: 10 }}>LOADING...</div>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A14' }}>
        <div className="pixel-text text-pp-gold" style={{ fontSize: 10 }}>REDIRECTING...</div>
      </div>
    )
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
          {loading ? 'SIGNING IN...' : '🔐 SIGN IN WITH GOOGLE'}
        </button>

        <div className="text-pp-muted" style={{ fontSize: 8 }}>
          👑 Eugine Micah access only
        </div>
      </div>
    </div>
  )
}
