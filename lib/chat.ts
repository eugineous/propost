// ============================================================
// ProPost Empire — CHAT chatRespond
// ============================================================

import { run } from '@/agents/gramgod/chat'
import { ChatDecision, DMContext } from '@/lib/types'
import { db } from '@/lib/db'
import { messages, agentActions } from '@/lib/schema'

const VALID_TONES = ['friendly', 'professional', 'hostile', 'spam'] as const
const VALID_GENDERS = ['male', 'female', 'unknown'] as const

export async function chatRespond(dm: DMContext): Promise<ChatDecision> {
  const result = await run(
    `Handle this Instagram DM from ${dm.senderUsername}`,
    {
      senderId: dm.senderId,
      senderUsername: dm.senderUsername,
      messageText: dm.messageText,
      receivedAt: dm.receivedAt.toISOString(),
      threadHistory: dm.threadHistory,
    }
  )

  const responseTimeMs = Date.now() - dm.receivedAt.getTime()

  // Parse JSON response
  let decision: ChatDecision
  try {
    const raw = result.data.response as string
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in CHAT response')
    const parsed = JSON.parse(jsonMatch[0]) as {
      responseText: string
      isBrandDeal: boolean
      detectedTone: string
      detectedGender: string
      escalateTo: string | null
      shouldRespond?: boolean
    }

    // Validate responseText non-empty
    const responseText = parsed.responseText?.trim() || ''
    if (!responseText && parsed.shouldRespond !== false) {
      throw new Error('Empty responseText from CHAT agent')
    }

    // Validate tone
    const detectedTone = VALID_TONES.includes(parsed.detectedTone as typeof VALID_TONES[number])
      ? (parsed.detectedTone as ChatDecision['detectedTone'])
      : 'friendly'

    // Validate gender
    const detectedGender = VALID_GENDERS.includes(parsed.detectedGender as typeof VALID_GENDERS[number])
      ? (parsed.detectedGender as ChatDecision['detectedGender'])
      : 'unknown'

    // Enforce business rules
    let escalateTo = parsed.escalateTo as ChatDecision['escalateTo']
    if (parsed.isBrandDeal) escalateTo = 'DEAL'
    if (detectedTone === 'hostile') escalateTo = 'EUGINE'

    decision = {
      responseText,
      isBrandDeal: parsed.isBrandDeal ?? false,
      detectedTone,
      detectedGender,
      escalateTo,
      responseTimeMs,
    }
  } catch {
    decision = {
      responseText: '',
      isBrandDeal: false,
      detectedTone: 'friendly',
      detectedGender: 'unknown',
      escalateTo: null,
      responseTimeMs,
    }
  }

  // Save message to DB
  await db.insert(messages).values({
    platform: 'instagram',
    senderId: dm.senderId,
    senderUsername: dm.senderUsername,
    senderGender: decision.detectedGender,
    content: dm.messageText,
    replyContent: decision.responseText || null,
    responseTimeMs: decision.responseTimeMs,
    isBrandDeal: decision.isBrandDeal,
    status: decision.escalateTo ? 'escalated' : 'replied',
    receivedAt: dm.receivedAt,
    repliedAt: decision.responseText ? new Date() : null,
    agentName: 'chat',
  })

  // Log to agent_actions
  await db.insert(agentActions).values({
    agentName: 'chat',
    company: 'gramgod',
    actionType: 'dm_handled',
    details: {
      senderId: dm.senderId,
      isBrandDeal: decision.isBrandDeal,
      detectedTone: decision.detectedTone,
      escalateTo: decision.escalateTo,
      responseTimeMs: decision.responseTimeMs,
    },
    outcome: 'success',
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
  })

  return decision
}
