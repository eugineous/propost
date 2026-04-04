// SubstackAdapter — publishes newsletters via Substack's unofficial API
//
// Authentication: cookie-based (connect.sid session cookie)
// Session is cached in-memory and refreshed when it expires (Substack sessions
// last ~30 days so we only re-login when we get a 401).
//
// ENV VARS REQUIRED:
//   SUBSTACK_PUBLICATION_URL  — e.g. "euginemicah.substack.com"
//   SUBSTACK_EMAIL            — falls back to EUGINE_EMAIL
//   SUBSTACK_PASSWORD         — your Substack / Substack-linked account password
//
// Substack API endpoints used:
//   POST https://substack.com/api/v1/login           → get session cookie
//   POST https://{pub}.substack.com/api/v1/drafts    → create draft
//   POST https://{pub}.substack.com/api/v1/drafts/{id}/publish → publish
//   GET  https://{pub}.substack.com/api/v1/posts/{id} → verify post

import type { PlatformAdapter, PostContent, PlatformPostResult, PostMetrics } from './x'
import { PlatformAPIError } from '../errors'

export interface SubstackPostContent {
  title: string
  subtitle?: string
  bodyHtml: string       // full newsletter body as HTML
  audience?: 'everyone' | 'paid' | 'founding'
  sendEmail?: boolean    // whether to email subscribers on publish
}

interface SubstackDraft {
  id: number
  slug?: string
  draft_title: string
  draft_subtitle?: string
}

// In-memory session cache (shared across all adapter instances in the process)
let cachedSessionCookie: string | null = null
let sessionExpiry = 0  // epoch ms

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEnv(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback
  if (!v) throw new Error(`${key} not set`)
  return v
}

function pubBase(): string {
  const url = getEnv('SUBSTACK_PUBLICATION_URL')
  // Normalise: strip protocol and trailing slash
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function pubUrl(): string {
  return `https://${pubBase()}`
}

/** Simple markdown-to-HTML converter for newsletter bodies */
export function mdToHtml(md: string): string {
  return md
    // H1-H3
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    // Unordered lists — group consecutive items
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs: blank-line-separated blocks not starting with < become <p>
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      if (trimmed.startsWith('<')) return trimmed
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`
    })
    .join('\n')
}

// ---------------------------------------------------------------------------
// SubstackAdapter
// ---------------------------------------------------------------------------

export class SubstackAdapter implements PlatformAdapter {
  readonly platform = 'substack' as const

  private async login(): Promise<string> {
    const email = process.env.SUBSTACK_EMAIL ?? process.env.EUGINE_EMAIL
    if (!email) throw new Error('SUBSTACK_EMAIL or EUGINE_EMAIL not set')
    const password = getEnv('SUBSTACK_PASSWORD')

    const res = await fetch('https://substack.com/api/v1/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, captcha_response: null }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new PlatformAPIError(
        'substack',
        res.status,
        false,
        `Substack login failed (${res.status}): ${body}`
      )
    }

    // Extract session cookie
    const setCookie = res.headers.get('set-cookie') ?? ''
    const match = setCookie.match(/connect\.sid=([^;]+)/)
    if (!match) {
      throw new PlatformAPIError('substack', 200, false, 'Substack login succeeded but no session cookie returned')
    }

    const cookie = `connect.sid=${match[1]}`
    cachedSessionCookie = cookie
    // Sessions last ~30 days; cache for 25 days
    sessionExpiry = Date.now() + 25 * 24 * 60 * 60 * 1000
    return cookie
  }

  private async getSession(): Promise<string> {
    if (cachedSessionCookie && Date.now() < sessionExpiry) {
      return cachedSessionCookie
    }
    return this.login()
  }

  /** Create a draft and immediately publish it. Returns the post URL. */
  async publishNewsletter(content: SubstackPostContent): Promise<PlatformPostResult> {
    const session = await this.getSession()

    const draftBody = {
      draft_title: content.title,
      draft_subtitle: content.subtitle ?? '',
      draft_body: content.bodyHtml,
      draft_bylines: [],
      section_id: null,
      audience: content.audience ?? 'everyone',
      type: 'newsletter',
    }

    // 1. Create draft
    const draftRes = await fetch(`${pubUrl()}/api/v1/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session,
      },
      body: JSON.stringify(draftBody),
    })

    if (!draftRes.ok) {
      // Session may have expired — retry once with fresh login
      if (draftRes.status === 401) {
        cachedSessionCookie = null
        return this.publishNewsletter(content)
      }
      const errBody = await draftRes.text().catch(() => '')
      throw new PlatformAPIError(
        'substack',
        draftRes.status,
        false,
        `Substack draft creation failed (${draftRes.status}): ${errBody}`
      )
    }

    const draft = (await draftRes.json()) as SubstackDraft
    const draftId = draft.id

    // 2. Publish the draft
    const publishBody = {
      send: content.sendEmail ?? true,
      share_automatically: false,
      audience: content.audience ?? 'everyone',
    }

    const publishRes = await fetch(`${pubUrl()}/api/v1/drafts/${draftId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session,
      },
      body: JSON.stringify(publishBody),
    })

    if (!publishRes.ok) {
      const errBody = await publishRes.text().catch(() => '')
      throw new PlatformAPIError(
        'substack',
        publishRes.status,
        false,
        `Substack publish failed (${publishRes.status}): ${errBody}`
      )
    }

    const published = (await publishRes.json()) as { id?: number; slug?: string; canonical_url?: string }
    const postUrl = published.canonical_url
      ?? (published.slug ? `${pubUrl()}/p/${published.slug}` : `${pubUrl()}/p/${draftId}`)

    return {
      success: true,
      postId: String(published.id ?? draftId),
      url: postUrl,
      rawResponse: published,
    }
  }

  /** PlatformAdapter.post — wraps publishNewsletter for simple text posts */
  async post(content: PostContent): Promise<PlatformPostResult> {
    // Split text into title (first line) and body (rest)
    const lines = content.text.split('\n')
    const title = lines[0].replace(/^#\s*/, '').trim() || 'ProPost Newsletter'
    const bodyMd = lines.slice(1).join('\n').trim() || content.text

    return this.publishNewsletter({
      title,
      bodyHtml: mdToHtml(bodyMd),
      sendEmail: true,
    })
  }

  async reply(_targetId: string, _content: string): Promise<PlatformPostResult> {
    return { success: false, error: 'Substack does not support replies via API' }
  }

  async getMetrics(_postId: string): Promise<PostMetrics> {
    // Substack stats API requires a Pro subscription to access programmatically
    return {}
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.getSession()
      return true
    } catch {
      return false
    }
  }
}

export const substackAdapter = new SubstackAdapter()
