export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — Content Repurpose API (Gemini-powered)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { hawkReview } from '@/lib/hawk'
import { cleanEnvValue } from '@/lib/env'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { content: string; sourcePlatform?: string }
    const { content, sourcePlatform = 'unknown' } = body

    if (!content) {
      return NextResponse.json({ ok: false, error: 'content is required' }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(cleanEnvValue(process.env.GEMINI_API_KEY))
    const model = genAI.getGenerativeModel({ model: cleanEnvValue(process.env.GEMINI_MODEL) || 'gemini-2.0-flash' })

    const prompt = `You are a content repurposing expert for Eugine Micah, a Kenyan media entrepreneur and digital creator based in Nairobi.

Take this ${sourcePlatform} content and adapt it for all 4 platforms. Keep Eugine's authentic voice — bold, Nairobi-rooted, entrepreneurial.

ORIGINAL CONTENT:
"${content}"

PLATFORM REQUIREMENTS:
- x: Max 280 chars, punchy, max 2 hashtags, can use Sheng naturally
- instagram: Hook + story + CTA, max 2 hashtags, visual-friendly caption
- linkedin: Professional but human, thought leadership angle, 150-300 words
- facebook: Conversational, community-focused, slightly longer, engaging question at end

Return ONLY valid JSON:
{
  "x": "adapted tweet text",
  "instagram": "adapted instagram caption",
  "linkedin": "adapted linkedin post",
  "facebook": "adapted facebook post"
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    let versions: Record<string, string> = {}
    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) versions = JSON.parse(match[0]) as Record<string, string>
    } catch {
      versions = {
        x: content.slice(0, 280),
        instagram: content,
        linkedin: content,
        facebook: content,
      }
    }

    // Run HAWK across versions (platform-specific guardrails)
    const reviews = await Promise.allSettled([
      hawkReview(versions.x ?? '', 'x', 'sovereign'),
      hawkReview(versions.instagram ?? '', 'instagram', 'sovereign'),
      hawkReview(versions.linkedin ?? '', 'linkedin', 'sovereign'),
      hawkReview(versions.facebook ?? '', 'facebook', 'sovereign'),
    ])

    const hawk = {
      x: reviews[0].status === 'fulfilled' ? reviews[0].value : null,
      instagram: reviews[1].status === 'fulfilled' ? reviews[1].value : null,
      linkedin: reviews[2].status === 'fulfilled' ? reviews[2].value : null,
      facebook: reviews[3].status === 'fulfilled' ? reviews[3].value : null,
    }

    return NextResponse.json({ ok: true, versions, hawk })
  } catch (err) {
    console.error('[content/repurpose]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
