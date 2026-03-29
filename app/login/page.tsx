'use client'

import { signIn } from 'next-auth/react'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-pp-bg flex items-center justify-center">
      <div className="pixel-card p-8 max-w-sm w-full text-center space-y-6">
        <h1 className="pixel-text text-pp-gold text-sm leading-relaxed">
          PROPOST<br />EMPIRE
        </h1>
        <p className="text-pp-muted text-xs">
          Autonomous Social Media Command Center
        </p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full bg-pp-gold text-pp-bg font-bold py-3 px-6 pixel-text text-xs hover:opacity-90 transition-opacity"
        >
          SIGN IN WITH GOOGLE
        </button>
        <p className="text-pp-muted text-xs">
          👑 Eugine Micah access only
        </p>
      </div>
    </div>
  )
}
