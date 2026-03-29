// ============================================================
// ProPost Empire — Cron Auth Middleware
// ============================================================

import { NextRequest } from 'next/server'

export function validateCronSecret(req: Request): boolean {
  const secret = (req as Request & { headers: Headers }).headers.get('x-cron-secret')
  if (!secret) return false
  return secret === process.env.CRON_SECRET
}

export function verifyCronAuth(req: NextRequest): { error: string } | null {
  const authHeader = req.headers.get('authorization')
  const cronSecret = req.headers.get('x-cron-secret')
  if (
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    cronSecret === process.env.CRON_SECRET
  ) {
    return null
  }
  return { error: 'Unauthorized' }
}
