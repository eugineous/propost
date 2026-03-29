export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cronAuth'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

RESPONSE TEMPLATES:
Tier 1 Brand (English): "Hey [Name]! Just saw this - sorry for the late reply. Love what [Brand] is doing - is this still open? Quick context: our IG audience loves culture & Gen Z stories. Would you prefer a quick call or details here?"
Tier 1 Brand (Sheng): "Boss [Name]! Just saw this - sorry for the late reply. Hii idea iko good. Send brief + timeline - nitaangalia. If it fits, tuta-plan call."
Tier 2 Advice (Sheng): "[Name]! Just saw this - sorry for the late reply. Hii story iko power. Tip: record kwa mtu mmoja tu - it turns content to conversation. What kind of clips you making now?"
Tier 2 Advice (English): "Hey [Name]! Just saw this - sorry for the late reply. Massive respect for sharing. One practical thing: do a 7-day content plan - short clips daily. Keep pushing!"
Tier 3 Praise (Sheng): "Asante sana boss! Noma. 🔥"
Tier 3 Praise (English): "Thanks! Appreciate the love - it keeps us going. 🙏"
Tier 4 Greeting (Sheng): "Niaje boss! Poa? 😄"
Tier 4 Greeting (English): "Hey! How's everything? 😊"

BRAND DEAL PROTOCOL: If message mentions sponsorship/partnership/collaboration/paid/brand/rate card/deal → Reply: "Hey! Thank you so much for reaching out 🙏 Eugine's team will be in touch shortly. Can you share your brand deck or brief? Looking forward to working together!"

NORTH STAR: "I'm not managing DMs. I'm building a community. Every response is a brick in my brand. Zero messages left behind. Every person acknowledged. Tutafika."

OUTPUT FORMAT (JSON only):
{
  "reply": "the reply text",
  "tier": 1|2|3|4,
  "isBrandDeal": true|false,
  "language": "sheng"|"english"
}
`

async function getInstagramDMs() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const igId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  if (!token || !igId) return []

  try {
    // Get conversations
    const convRes = await fetch(
      `https://graph.facebook.com/v25.0/${igId}/conversations?fields=id,updated_time,participants&access_token=${token}`
    )
    if (!convRes.ok) return []
    const convData = await convRes.json() as { data?: Array<{ id: string; updated_time: string; participants: { data: Array<{ id: string; username: string }> } }> }
    const conversations = convData.data ?? []

    const dms: Array<{ senderId: string; senderUsername: string; messageText: string; receivedAt: Date; conversationId: string }> = []

    for (const conv of conversations.slice(0, 50)) { // process up to 50 conversations
      const msgRes = await fetch(
        `https://graph.facebook.com/v25.0/${conv.id}/messages?fields=id,message,from,created_time&access_token=${token}`
      )
      if (!msgRes.ok) continue
      const msgData = await msgRes.json() as { data?: Array<{ id: string; message: string; from: { id: string; username?: string }; created_time: string }> }
      const msgs = msgData.data ?? []

      // Get the latest message from the other person (not Eugine)
      const otherMsgs = msgs.filter(m => m.from.id !== igId)
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
  } catch {
    return []
  }
}

async function replyToInstagramDM(conversationId: string, replyText: string): Promise<boolean> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const igId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  if (!token || !igId) return false

  try {
    const res = await fetch(`https://graph.facebook.com/v25.0/${igId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { conversation_id: conversationId },
        message: { text: replyText },
        access_token: token,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function generateReply(messageText: string, senderUsername: string, receivedAt: Date): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return ''

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const hoursOld = Math.floor((Date.now() - receivedAt.getTime()) / (1000 * 60 * 60))
  const prompt = `${INSTAGRAM_KNOWLEDGE_BASE}

Message from @${senderUsername} (received ${hoursOld} hours ago):
"${messageText}"

Generate a reply following the knowledge base. Output JSON only.`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return ''
    const parsed = JSON.parse(jsonMatch[0]) as { reply?: string }
    return parsed.reply ?? ''
  } catch {
    return ''
  }
}

export async function GET(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  let processed = 0
  let replied = 0
  let brandDeals = 0

  try {
    const dms = await getInstagramDMs()

    for (const dm of dms) {
      try {
        const replyText = await generateReply(dm.messageText, dm.senderUsername, dm.receivedAt)
        if (!replyText) continue

        const sent = await replyToInstagramDM(dm.conversationId, replyText)
        processed++
        if (sent) replied++

        const isBrandDeal = /sponsor|partner|collab|paid|brand|rate card|deal/i.test(dm.messageText)
        if (isBrandDeal) brandDeals++

        await db.insert(agentActions).values({
          agentName: 'chat',
          company: 'gramgod',
          actionType: 'dm_backlog_reply',
          details: {
            senderId: dm.senderId,
            senderUsername: dm.senderUsername,
            messagePreview: dm.messageText.slice(0, 100),
            replyPreview: replyText.slice(0, 100),
            hoursOld: Math.floor((Date.now() - dm.receivedAt.getTime()) / (1000 * 60 * 60)),
            isBrandDeal,
            sent,
          },
          outcome: sent ? 'success' : 'failed',
        })

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 500))
      } catch {
        // Continue with next DM
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      replied,
      brandDeals,
      durationMs: Date.now() - startTime,
    })
  } catch (err) {
    console.error('[ig-backlog]', err)
    return NextResponse.json({ error: 'Backlog processing failed' }, { status: 500 })
  }
}
