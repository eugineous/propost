export const dynamic = 'force-dynamic'
// Debug endpoint — shows which OAuth env vars are set (values hidden)
// Only accessible when logged in
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const check = (key: string) => {
    const val = process.env[key]
    if (!val) return '❌ missing'
    if (val === 'placeholder') return '⚠️ placeholder'
    return `✅ set (${val.slice(0, 6)}...)`
  }

  return NextResponse.json({
    meta: {
      FACEBOOK_APP_ID:     check('FACEBOOK_APP_ID'),
      FACEBOOK_APP_SECRET: check('FACEBOOK_APP_SECRET'),
      META_APP_ID:         check('META_APP_ID'),
      META_APP_SECRET:     check('META_APP_SECRET'),
    },
    linkedin: {
      LINKEDIN_CLIENT_ID:     check('LINKEDIN_CLIENT_ID'),
      LINKEDIN_CLIENT_SECRET: check('LINKEDIN_CLIENT_SECRET'),
    },
    x: {
      X_CLIENT_ID:     check('X_CLIENT_ID'),
      X_CLIENT_SECRET: check('X_CLIENT_SECRET'),
    },
    tiktok: {
      TIKTOK_CLIENT_KEY:    check('TIKTOK_CLIENT_KEY'),
      TIKTOK_CLIENT_SECRET: check('TIKTOK_CLIENT_SECRET'),
    },
    redirectUris: {
      instagram: `${process.env.NEXTAUTH_URL ?? 'https://propost.vercel.app'}/api/auth/callback/instagram`,
      facebook:  `${process.env.NEXTAUTH_URL ?? 'https://propost.vercel.app'}/api/auth/callback/facebook`,
      linkedin:  `${process.env.NEXTAUTH_URL ?? 'https://propost.vercel.app'}/api/auth/callback/linkedin`,
      x:         `${process.env.NEXTAUTH_URL ?? 'https://propost.vercel.app'}/api/auth/callback/x`,
      tiktok:    `${process.env.NEXTAUTH_URL ?? 'https://propost.vercel.app'}/api/auth/callback/tiktok`,
    },
    note: 'Add each redirectUri above to the allowed redirect URIs in each platform\'s developer portal',
  })
}
