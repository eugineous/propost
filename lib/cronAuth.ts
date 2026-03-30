// ============================================================
// ProPost Empire — Cron Auth Middleware
// ============================================================

import { NextRequest } from 'next/server'

export function validateCronSecret(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  // No secret configured → allow (bootstrap / dev mode)
  if (!expected) return true
  const secret = (req as Request & { headers: Headers }).headers.get('x-cron-secret')
  if (!secret) return false
  return secret === expected
}

export function verifyCronAuth(req: NextRequest): { error: string } | null {
  const expected = process.env.CRON_SECRET
  // No secret configured → allow (bootstrap / dev mode)
  if (!expected) return null
  const authHeader = req.headers.get('authorization')
  const cronSecret = req.headers.get('x-cron-secret')
  if (
    authHeader === `Bearer ${expected}` ||
    cronSecret === expected
  ) {
    return null
  }
  return { error: 'Unauthorized' }
}
