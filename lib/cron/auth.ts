// Shared cron authentication helper
// All cron routes must call this before executing.
//
// Crons are ONLY triggered by the Cloudflare Worker — never by Vercel.
// The worker sends:
//   Authorization: Bearer <CRON_SECRET>
//   x-internal-secret: <INTERNAL_SECRET>
//
// Both must be present and valid.

import { NextRequest } from 'next/server'

export function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const internalSecret = process.env.INTERNAL_SECRET

  if (!cronSecret) return false

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) return false

  // If INTERNAL_SECRET is configured, also require it
  if (internalSecret) {
    const internal = req.headers.get('x-internal-secret')
    if (internal !== internalSecret) return false
  }

  return true
}
