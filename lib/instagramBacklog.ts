import { db } from '@/lib/db'
import { agentActions, messages } from '@/lib/schema'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { cleanEnvValue } from '@/lib/env'

const BASE_URL = 'https://graph.facebook.com/v25.0'

const INSTAGRAM_KNOWLEDGE_BASE = `
You are CHAT, the DM Response Agent of GramGod Corp for Eugine Micah (also known as Eugine Roylandz).
Eugine is: Head of Digital at PPP TV Kenya, Co-host Urban News (StarTimes Ch.430), Media Entrepreneur, Author (Born Broke Built Loud), Podcast Host (The Nairobi Podcast).

CRITICAL RULE: Reply to EVERY message. No message gets ignored. Even if it is 365 days old.

LANGUAGE RULES:
- USE SHENG when: They wrote in Sheng (niaje, poa, sasa, vipi, mambo, noma), young Kenyan audience (18-30), casual/friendly vibe
- USE ENGLISH when: Formal brand inquiries, international followers, professional collaborations, they wrote in English

DELAY APOLOGY: If message is >48 hours old, add "Just saw this - sorry for the late reply."

CLASSIFICATION:
- Tier 1 HIGH VALUE: Brand inquiries, partnerships, paid collabs, creator collaborations, media professionals → Reply immediately, professional + warm
- Tier 2 COMMUNITY: Advice seekers, supporters with substance, story sharers → Reply with encouragement
- Tier 3 QUICK APPRECIATION: Basic praise, fire emojis, short positives → Reply warmly and briefly
- Tier 4 GREETINGS: Hi/Hello, Niaje, Sasa, Vipi → Reply briefly but warmly

BRAND DEAL PROTOCOL: If message mentions sponsorship/partnership/collaboration/paid/brand/rate card/deal → Reply: "Hey! Thank you so much for reaching out 🙏 Eugine's team will be in touch shortly. Can you share your brand deck or brief? Looking forward to working together!"

OUTPUT FORMAT (JSON only):
{
  "reply": "the reply text",
  "tier": 1|2|3|4,
  "isBrandDeal": true|false,
  "language": "sheng"|"english"
}
`

type BacklogDM = {
  senderId: string
  senderUsername: string
  messageText: string
  receivedAt: Date
  conversationId: string
}

function token() {
  return cleanEnvValue(process.env.INSTAGRAM_ACCESS_TOKEN)
}

function igId() {
  return cleanEnvValue(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID)
}

async function igGetJson<T>(path: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE_URL}${path}${sep}access_token=${token()}`)
  if (!res.ok) throw new Error(`IG API ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

async function getInstagramDMs(limitConversations: number): Promise<BacklogDM[]> {
  if (!token() || !igId()) return []

  const convData = await igGetJson<{ data?: Array<{ id: string }> }>(
    `/${igId()}/conversations?fields=id,updated_time,participants&limit=${Math.max(1, limitConversations)}`
  )
  const conversations = convData.data ?? []

  const dms: BacklogDM[] = []

  for (const conv of conversations) {
    const msgData = await igGetJson<{ data?: Array<{ message: string; from: { id: string; username?: string }; created_time: string }> }>(
      `/${conv.id}/messages?fields=id,message,from,created_time&limit=25`
    )
    const msgs = msgData.data ?? []
    const otherMsgs = msgs.filter((m) => m.from.id !== igId())
    if (otherMsgs.length === 0) continue

    const latest = otherMsgs[0]
    dms.push({
      senderId: latest.from.id,
      senderUsername: latest.from.username ?? latest.from.id,
      messageText: latest.message,
      receivedAt: new Date(latest.created_time),
      conversationId: conv.id,
    })
  }

  return dms
}

async function replyToInstagramDM(conversationId: string, replyText: string): Promise<boolean> {
  if (!token() || !igId()) return false
  const res = await fetch(`${BASE_URL}/${igId()}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { conversation_id: conversationId },
      message: { text: replyText },
      access_token: token(),
    }),
  })
  return res.ok
}

async function generateReply(messageText: string, senderUsername: string, receivedAt: Date): Promise<{ replyText: string; isBrandDeal: boolean; tier: number; language: string }> {
  const apiKey = cleanEnvValue(process.env.GEMINI_API_KEY)
  if (!apiKey) return { replyText: '', isBrandDeal: false, tier: 4, language: 'english' }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: cleanEnvValue(process.env.GEMINI_MODEL) || 'gemini-1.5-flash' })

  const hoursOld = Math.floor((Date.now() - receivedAt.getTime()) / (1000 * 60 * 60))
  const prompt = `${INSTAGRAM_KNOWLEDGE_BASE}

Message from @${senderUsername} (received ${hoursOld} hours ago):
"${messageText}"

Generate a reply following the knowledge base. Output JSON only.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { replyText: '', isBrandDeal: false, tier: 4, language: 'english' }

  const parsed = JSON.parse(jsonMatch[0]) as { reply?: string; isBrandDeal?: boolean; tier?: number; language?: string }
  return {
    replyText: (parsed.reply ?? '').trim(),
    isBrandDeal: Boolean(parsed.isBrandDeal),
    tier: Number(parsed.tier ?? 4),
    language: String(parsed.language ?? 'english'),
  }
}

export async function processInstagramBacklog(opts?: { maxConversations?: number; maxReplies?: number; runBy?: 'cron' | 'command' }) {
  const startTime = Date.now()
  const maxConversations = Math.max(1, opts?.maxConversations ?? 50)
  const maxReplies = Math.max(1, opts?.maxReplies ?? 25)
  const runBy = opts?.runBy ?? 'cron'

  const dms = await getInstagramDMs(maxConversations)

  let processed = 0
  let replied = 0
  let brandDeals = 0
  const handled: Array<{ senderUsername: string; sent: boolean; isBrandDeal: boolean; hoursOld: number }> = []

  for (const dm of dms.slice(0, maxReplies)) {
    try {
      const gen = await generateReply(dm.messageText, dm.senderUsername, dm.receivedAt)
      if (!gen.replyText) continue

      const sent = await replyToInstagramDM(dm.conversationId, gen.replyText)
      processed++
      if (sent) replied++

      const isBrandDeal = gen.isBrandDeal || /sponsor|partner|collab|paid|brand|rate card|deal/i.test(dm.messageText)
      if (isBrandDeal) brandDeals++

      const hoursOld = Math.floor((Date.now() - dm.receivedAt.getTime()) / (1000 * 60 * 60))
      handled.push({ senderUsername: dm.senderUsername, sent, isBrandDeal, hoursOld })

      await db.insert(agentActions).values({
        agentName: 'chat',
        company: 'gramgod',
        actionType: 'dm_replied',
        details: {
          summary: `Replied to @${dm.senderUsername} (inbox): "${gen.replyText.slice(0, 60)}"`,
          runBy,
          senderId: dm.senderId,
          senderUsername: dm.senderUsername,
          senderMessage: dm.messageText.slice(0, 120),
          messageLocation: 'inbox',
          replyText: gen.replyText.slice(0, 120),
          platform: 'instagram',
          escalatedTo: isBrandDeal ? 'DEAL' : null,
          tier: gen.tier,
          language: gen.language,
          hoursOld,
          isBrandDeal,
          sent,
        },
        outcome: sent ? 'success' : 'failed',
      })

      // Persist DM + reply trace for inbox/message request visibility.
      await db.insert(messages).values({
        platform: 'instagram',
        platformMsgId: `${dm.conversationId}:${dm.senderId}:${dm.receivedAt.getTime()}`,
        senderId: dm.senderId,
        senderUsername: dm.senderUsername,
        content: dm.messageText,
        replyContent: sent ? gen.replyText : null,
        messageLocation: 'inbox',
        status: sent ? 'replied' : 'pending',
        isBrandDeal,
        receivedAt: dm.receivedAt,
        repliedAt: sent ? new Date() : null,
        responseTimeMs: Math.max(0, Date.now() - dm.receivedAt.getTime()),
        agentName: 'chat',
      }).catch(() => {
        // Ignore duplicates from repeated backlog runs.
      })

      await new Promise((r) => setTimeout(r, 400))
    } catch {
      // continue
    }
  }

  // Batch summary row (so you can SEE what was handled in one place)
  await db.insert(agentActions).values({
    agentName: 'chat',
    company: 'gramgod',
    actionType: 'dm_backlog_summary',
    details: {
      summary: `DM backlog: replied ${replied}/${processed} (scanned ${dms.length})`,
      runBy,
      scanned: dms.length,
      processed,
      replied,
      brandDeals,
      sampleHandled: handled.slice(0, 10),
    },
    outcome: 'success',
  })

  return {
    ok: true,
    scanned: dms.length,
    processed,
    replied,
    brandDeals,
    durationMs: Date.now() - startTime,
  }
}

