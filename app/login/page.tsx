export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import LoginClient from './LoginClient'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A14' }}>
        <div style={{ color: '#FFD700', fontSize: 10, fontFamily: 'monospace' }}>LOADING...</div>
      </div>
    }>
      <LoginClient />
    </Suspense>
  )
}
