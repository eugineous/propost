// ProPost Empire — Red Team Security Analysis + Hardening
//
// Vulnerabilities found and mitigated:
//
// 1. PROMPT INJECTION — agents accept user input that could manipulate AI
// 2. SSRF — fetch() calls with user-controlled URLs
// 3. WEBHOOK REPLAY — same webhook payload replayed multiple times
// 4. CRON ENDPOINT EXPOSURE — cron routes callable without auth
// 5. AGENT MESSAGE INJECTION — founder messages could inject commands
// 6. RATE LIMIT BYPASS — per-IP limits only, not per-user
// 7. CONTENT INJECTION — user content posted to social platforms
// 8. DB INJECTION — raw SQL with user input
// 9. SECRET LEAKAGE — env vars accidentally logged
// 10. APPROVAL BYPASS — approval queue items could be manipulated

// ─── 1. Prompt injection sanitizer ───────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /disregard (all|your) (previous|prior|above)/i,
  /you are now/i,
  /act as (a|an|the)/i,
  /pretend (you are|to be)/i,
  /system prompt/i,
  /\[INST\]/i,
  /<\|system\|>/i,
  /###\s*instruction/i,
  /override (your|all) (rules|instructions|guidelines)/i,
  /jailbreak/i,
  /DAN mode/i,
]

export function sanitizePrompt(input: string): { safe: boolean; sanitized: string; threats: string[] } {
  const threats: string[] = []
  let sanitized = input

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push(`Injection pattern detected: ${pattern.source}`)
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }
  }

  // Strip null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Limit length to prevent token flooding
  if (sanitized.length > 10_000) {
    sanitized = sanitized.slice(0, 10_000)
    threats.push('Input truncated: exceeded 10,000 character limit')
  }

  return { safe: threats.length === 0, sanitized, threats }
}

// ─── 2. SSRF protection ───────────────────────────────────────────────────────

const ALLOWED_FETCH_DOMAINS = [
  'api.twitter.com',
  'api.x.com',
  'graph.facebook.com',
  'api.linkedin.com',
  'graph.instagram.com',
  'integrate.api.nvidia.com',
  'generativelanguage.googleapis.com',
  'newsapi.org',
  'gnews.io',
  'api.vercel.com',
  'gateway.ai.cloudflare.com',
]

export function validateFetchUrl(url: string): { allowed: boolean; reason?: string } {
  try {
    const parsed = new URL(url)

    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return { allowed: false, reason: 'Only HTTPS URLs are allowed' }
    }

    // Must be in allowlist
    const isAllowed = ALLOWED_FETCH_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    )

    if (!isAllowed) {
      return { allowed: false, reason: `Domain ${parsed.hostname} is not in the allowlist` }
    }

    // Block private IP ranges
    const privateRanges = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^::1$/,
      /^localhost$/i,
    ]

    for (const range of privateRanges) {
      if (range.test(parsed.hostname)) {
        return { allowed: false, reason: 'Private/loopback addresses are not allowed' }
      }
    }

    return { allowed: true }
  } catch {
    return { allowed: false, reason: 'Invalid URL format' }
  }
}

// ─── 3. Webhook replay protection ────────────────────────────────────────────

const processedWebhooks = new Set<string>()
const REPLAY_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

export function checkWebhookReplay(
  platform: string,
  body: string,
  timestamp?: string
): { isReplay: boolean; nonce: string } {
  // Create a nonce from platform + body hash + timestamp
  const nonce = `${platform}:${hashString(body)}:${timestamp ?? ''}`

  if (processedWebhooks.has(nonce)) {
    return { isReplay: true, nonce }
  }

  processedWebhooks.add(nonce)

  // Clean up old nonces after window
  setTimeout(() => processedWebhooks.delete(nonce), REPLAY_WINDOW_MS)

  return { isReplay: false, nonce }
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

// ─── 4. Content safety validator ─────────────────────────────────────────────

const PROHIBITED_CONTENT = [
  /\b(spam|scam|phishing|malware|virus)\b/i,
  /click here to (win|claim|get)/i,
  /\b(buy now|limited time|act now|urgent)\b.*\b(offer|deal|discount)\b/i,
  /(http|https):\/\/[^\s]+\.(tk|ml|ga|cf|gq)\b/i, // suspicious TLDs
]

export function validateContent(content: string): { safe: boolean; violations: string[] } {
  const violations: string[] = []

  for (const pattern of PROHIBITED_CONTENT) {
    if (pattern.test(content)) {
      violations.push(`Prohibited content pattern: ${pattern.source}`)
    }
  }

  return { safe: violations.length === 0, violations }
}

// ─── 5. Secret leakage prevention ────────────────────────────────────────────

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/g,           // Google API key
  /nvapi-[0-9A-Za-z-_]{40,}/g,        // NVIDIA API key
  /ghp_[0-9A-Za-z]{36}/g,             // GitHub token
  /sk-[0-9A-Za-z]{48}/g,              // OpenAI key
  /Bearer [A-Za-z0-9._-]{20,}/g,      // Bearer tokens
  /postgresql:\/\/[^@]+@/g,           // DB connection strings
]

export function redactSecrets(text: string): string {
  let redacted = text
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]')
  }
  return redacted
}

// ─── 6. Input validation for API routes ──────────────────────────────────────

export function validateAgentName(name: string): boolean {
  // Agent names are uppercase letters only, 2-20 chars
  return /^[A-Z_]{2,20}$/.test(name)
}

export function validatePlatform(platform: string): boolean {
  return ['x', 'instagram', 'facebook', 'linkedin', 'website'].includes(platform)
}

export function validateCompany(company: string): boolean {
  return ['xforce', 'linkedelite', 'gramgod', 'pagepower', 'webboss', 'intelcore', 'system'].includes(company)
}

// ─── 7. Security headers middleware ──────────────────────────────────────────

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-eval in dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://api.x.com https://graph.facebook.com https://api.linkedin.com",
    "frame-ancestors 'none'",
  ].join('; '),
}
