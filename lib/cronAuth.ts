// ============================================================
// ProPost Empire — Cron Auth Middleware
// ============================================================

export function validateCronSecret(req: Request): boolean {
  const secret = (req as Request & { headers: Headers }).headers.get('x-cron-secret')
  if (!secret) return false
  return secret === process.env.CRON_SECRET
}
