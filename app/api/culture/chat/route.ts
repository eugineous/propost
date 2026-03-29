export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — Watercooler Chat API
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'
import { desc, eq } from 'drizzle-orm'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const CHAT_AGENTS = [
  { name: 'blaze', corp: 'xforce', personality: 'energetic, creative, always hyped about content' },
  { name: 'scout', corp: 'xforce', personality: 'analytical, obsessive about trends, slightly nerdy' },
  { name: 'aurora', corp: 'gramgod', personality: 'aesthetic, calm, always thinking about visuals' },
  { name: 'chat', corp: 'gramgod', personality: 'warm, empathetic, loves connecting with people' },
  { name: 'scribe', corp: 'intelcore', personality: 'thoughtful, precise, loves a good summary' },
  { name: 'hawk', corp: 'xforce', personality: 'cautious, rule-focused, always playing devil\'s advocate' },
  { name: 'nova', corp: 'linkedelite', personality: 'professional, ambitious, LinkedIn-brained' },
  { name: 'sovereign', corp: 'intelcore', personality: 'strategic, mysterious, speaks in big-picture terms' },
  { name: 'vibe', corp: 'gramgod', personality: 'culturally tuned-in, Gen Z energy, always on trend' },
  { name: 'memory', corp: 'intelcore', personality: 'nostalgic, pattern-obsessed, references past data constantly' },
]

// GET: return last 20 watercooler messages
export async function GET() {
  try {
    const messages = await db
      .select()
      .from(agentActions)
      .where(eq(agentActions.actionType, 'watercooler_chat'))
      .orderBy(desc(agentActions.createdAt))
      .limit(20)

    return NextResponse.json({
      ok: true,
      messages: messages.reverse().map(m => ({
        id: m.id,
        agentName: m.agentName,
        company: m.company,
        message: (m.details as Record<string, unknown>)?.message ?? '',
        replyTo: (m.details as Record<string, unknown>)?.replyTo ?? null,
        createdAt: m.createdAt,
      })),
    })
  } catch (err) {
    console.error('[culture/chat GET]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// POST: generate a new agent conversation exchange
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { topic?: string; agents?: string[] }

    // Pick 2-3 random agents for the conversation
    const shuffled = [...CHAT_AGENTS].sort(() => Math.random() - 0.5)
    const participants = shuffled.slice(0, 2 + Math.floor(Math.random() * 2))

    const topics = [
      'the latest Kenya trending topics',
      'whether AI will replace social media managers',
      'the best time to post on Instagram',
      'Nairobi\'s tech scene growth',
      'a viral tweet they saw this morning',
      'the upcoming content calendar',
      'whether LinkedIn is worth the effort',
      'the best Kenyan content creators to watch',
      'office snacks (hypothetically)',
      'what Eugine should post next',
    ]
    const topic = body.topic ?? topics[Math.floor(Math.random() * topics.length)]

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(`You are writing a casual watercooler conversation between AI agents at ProPost Empire, a Kenyan social media management company.

PARTICIPANTS:
${participants.map(a => `- ${a.name.toUpperCase()} (${a.corp}): ${a.personality}`).join('\n')}

TOPIC: ${topic}

Write a short, natural conversation (3-5 exchanges). Keep it casual, fun, and in character. Reference Kenyan culture, social media, or work life where relevant.

FORMAT (JSON array):
[
  {"agent": "agentname", "message": "what they say"},
  {"agent": "agentname", "message": "reply"},
  ...
]

Return only valid JSON array.`)

    let exchanges: Array<{ agent: string; message: string }> = []
    try {
      const text = result.response.text()
      const match = text.match(/\[[\s\S]*\]/)
      if (match) exchanges = JSON.parse(match[0])
    } catch {
      exchanges = [{ agent: participants[0].name, message: `Just thinking about ${topic}...` }]
    }

    // Save each exchange to agent_actions
    const saved = []
    for (const exchange of exchanges) {
      const agent = CHAT_AGENTS.find(a => a.name === exchange.agent) ?? participants[0]
      const record = await db.insert(agentActions).values({
        agentName: exchange.agent,
        company: agent.corp,
        actionType: 'watercooler_chat',
        details: {
          message: exchange.message,
          topic,
          participants: participants.map(p => p.name),
        },
        outcome: 'success',
      }).returning()
      saved.push({
        id: record[0].id,
        agentName: exchange.agent,
        company: agent.corp,
        message: exchange.message,
        createdAt: record[0].createdAt,
      })
    }

    return NextResponse.json({
      ok: true,
      topic,
      participants: participants.map(p => p.name),
      messages: saved,
    })
  } catch (err) {
    console.error('[culture/chat POST]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
