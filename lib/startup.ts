// Validates all required environment variables at startup.
// Returns StartupReport with missing vars, disabled platforms, and healthy flag.
// Logs each missing var with platform context.
// Does NOT throw — gracefully disables affected platforms.

import type { Platform } from './types'

export interface StartupReport {
  missing: string[]
  disabled: Platform[]
  healthy: boolean
  aiProviders: { gemini: boolean; nvidia: boolean }
  database: boolean
}

export const REQUIRED_ENV: Record<Platform, string[]> = {
  x: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'],
  instagram: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID'],
  facebook: ['FACEBOOK_PAGE_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID'],
  linkedin: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_PERSON_URN'],
  website: ['VERCEL_DEPLOY_HOOK_URL'],
}

const AI_ENV = {
  gemini: 'GEMINI_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
}

const DB_ENV = 'DATABASE_URL'

export async function validateStartup(): Promise<StartupReport> {
  const missing: string[] = []
  const disabled: Platform[] = []

  // Check per-platform credentials
  for (const [platform, vars] of Object.entries(REQUIRED_ENV) as [Platform, string[]][]) {
    const platformMissing = vars.filter((v) => !process.env[v])
    if (platformMissing.length > 0) {
      for (const v of platformMissing) {
        console.warn(`[startup] Missing env var: ${v} (required for platform: ${platform})`)
        missing.push(v)
      }
      disabled.push(platform)
      console.warn(`[startup] Platform disabled due to missing credentials: ${platform}`)
    }
  }

  // Check AI providers
  const gemini = Boolean(process.env[AI_ENV.gemini])
  const nvidia = Boolean(process.env[AI_ENV.nvidia])

  if (!gemini) {
    console.warn(`[startup] Missing env var: ${AI_ENV.gemini} (Gemini AI provider disabled)`)
    missing.push(AI_ENV.gemini)
  }
  if (!nvidia) {
    console.warn(`[startup] Missing env var: ${AI_ENV.nvidia} (NVIDIA AI provider disabled)`)
    missing.push(AI_ENV.nvidia)
  }

  // Check database
  const database = Boolean(process.env[DB_ENV])
  if (!database) {
    console.warn(`[startup] Missing env var: ${DB_ENV} (database unavailable)`)
    missing.push(DB_ENV)
  }

  const healthy = missing.length === 0

  const report: StartupReport = {
    missing,
    disabled,
    healthy,
    aiProviders: { gemini, nvidia },
    database,
  }

  if (healthy) {
    console.log('[startup] All environment variables present — system healthy')
  } else {
    console.warn(
      `[startup] Startup validation complete — ${missing.length} missing vars, ${disabled.length} disabled platforms`
    )
  }

  return report
}
