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

  // Vercel's own cron invocations come from 169.254.0.0/16 with no auth header
  // Allow them through when CRON_SECRET is set by checking the Vercel header
  const vercelCronHeader = req.headers.get('x-vercel-cron')
  if (vercelCronHeader === '1') return true

  if (!cronSecret) return false

  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${cronSecret}`) {
    // If INTERNAL_SECRET is configured, also require it
    if (internalSecret) {
      const internal = req.headers.get('x-internal-secret')
      if (internal !== internalSecret) return false
    }
    return true
  }

  // Also accept x-cron-secret header (Cloudflare Worker sends this)
  const cronHeader = req.headers.get('x-cron-secret')
  if (cronHeader === cronSecret) return true

  return false
}
