export const dynamic = 'force-dynamic'
// ============================================================
// ProPost Empire — Command API Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dispatchToAgent } from '@/lib/agentDispatch'
import { CommandRequest, CommandResponse, Corp } from '@/lib/types'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'
import { randomUUID } from 'crypto'
import { processInstagramBacklog } from '@/lib/instagramBacklog'

// Keyword-based fallback routing when Gemini is unavailable
function keywordRoute(text: string): { targetCorp: Corp; targetAgent: string; intent: string } {
  const t = text.toLowerCase()
  if (t.includes('tweet') || t.includes('post on x') || t.includes('twitter')) {
    return { targetCorp: 'xforce', targetAgent: 'blaze', intent: 'post_to_x' }
  }
  if (t.includes('instagram') || t.includes('ig') || t.includes('reel') || t.includes('story')) {
    return { targetCorp: 'gramgod', targetAgent: 'aurora', intent: 'post_to_instagram' }
  }
  if (t.includes('linkedin')) {
    return { targetCorp: 'linkedelite', targetAgent: 'nova', intent: 'post_to_linkedin' }
  }
  if (t.includes('facebook') || t.includes('fb')) {
    return { targetCorp: 'pagepower', targetAgent: 'chief', intent: 'post_to_facebook' }
  }
  if (t.includes('dm') || t.includes('message') || t.includes('reply')) {
    return { targetCorp: 'gramgod', targetAgent: 'chat', intent: 'reply_dms' }
  }
  if (t.includes('trend') || t.includes('scout')) {
    return { targetCorp: 'xforce', targetAgent: 'scout', intent: 'fetch_trends' }
  }
  if (t.includes('learn pattern') || t.includes('learn') || t.includes('memory')) {
    return { targetCorp: 'intelcore', targetAgent: 'memory', intent: 'learn_patterns' }
  }
  if (t.includes('brief') || t.includes('report') || t.includes('summary')) {
    return { targetCorp: 'intelcore', targetAgent: 'scribe', intent: 'generate_briefing' }
  }
  if (t.includes('crisis') || t.includes('risk check') || t.includes('safety check')) {
    return { targetCorp: 'intelcore', targetAgent: 'sentry', intent: 'crisis_check' }
  }
  if (t.includes('website') || t.includes('seo') || t.includes('web')) {
    return { targetCorp: 'webboss', targetAgent: 'root', intent: 'web_task' }
  }
  return { targetCorp: 'intelcore', targetAgent: 'sovereign', intent: 'general_command' }
}

async function invokeWork(req: NextRequest, agents: string[]) {
  const origin = new URL(req.url).origin
  const res = await fetch(`${origin}/api/agents/work`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agents }),
    cache: 'no-store',
  })
  const json = await res.json() as { ok?: boolean; results?: Record<string, unknown>; errors?: Record<string, string> }
  return { ok: res.ok && Boolean(json.ok), json }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CommandRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Accept both `text` and `command` fields for compatibility
  const commandText = body.text ?? (body as unknown as { command?: string }).command ?? ''
  if (!commandText.trim()) {
    return NextResponse.json({ error: 'text or command is required' }, { status: 400 })
  }
  body.text = commandText

  const commandId = randomUUID()
  let targetCorp: Corp = 'intelcore'
  let targetAgent = 'sovereign'
  let intent = body.text
  let status: CommandResponse['status'] = 'executing'
  let preview: string | undefined
  let routingMethod = 'gemini'
  let routingError: string | undefined

  // Try Gemini classification first
  try {
    const { classifyCommand } = await import('@/lib/sovereign')
    const route = await classifyCommand(body.text)
    targetCorp = route.targetCorp
    targetAgent = route.targetAgent
    intent = route.intent
    if (route.priority === 'pending_human') {
      status = 'needs_human'
    }
  } catch (err) {
    // Gemini failed — fall back to keyword routing
    routingError = String(err)
    routingMethod = 'keyword_fallback'
    console.warn('[command] Gemini classify failed, using keyword fallback:', err)
    const fallback = keywordRoute(body.text)
    targetCorp = fallback.targetCorp
    targetAgent = fallback.targetAgent
    intent = fallback.intent
  }

  // Dispatch to agent (if not pending human)
  if (status !== 'needs_human') {
    try {
      // Deterministic execution for known high-impact commands (so commands always "do the thing")
      if (intent === 'reply_dms') {
        const result = await processInstagramBacklog({ runBy: 'command', maxReplies: 15, maxConversations: 50 })
        preview = `CHAT: replied ${result.replied}/${result.processed} (scanned ${result.scanned})`
      } else if (intent === 'fetch_trends') {
        const run = await invokeWork(req, ['SCOUT'])
        if (run.ok) {
          const scout = run.json.results?.SCOUT as { trendsFound?: number } | undefined
          preview = `SCOUT: fetched ${scout?.trendsFound ?? 0} trends`
        } else {
          status = 'queued'
          preview = `SCOUT run failed: ${JSON.stringify(run.json.errors ?? {}).slice(0, 120)}`
        }
      } else if (intent === 'post_to_x') {
        const run = await invokeWork(req, ['BLAZE'])
        if (run.ok) {
          const blaze = run.json.results?.BLAZE as { type?: string } | undefined
          preview = `BLAZE: generated ${blaze?.type ?? 'tweet'} draft`
        } else {
          status = 'queued'
          preview = `BLAZE run failed: ${JSON.stringify(run.json.errors ?? {}).slice(0, 120)}`
        }
      } else if (intent === 'generate_briefing') {
        const run = await invokeWork(req, ['SCRIBE'])
        if (run.ok) {
          preview = 'SCRIBE: generated latest briefing'
        } else {
          status = 'queued'
          preview = `SCRIBE run failed: ${JSON.stringify(run.json.errors ?? {}).slice(0, 120)}`
        }
      } else if (intent === 'learn_patterns') {
        const run = await invokeWork(req, ['MEMORY'])
        if (run.ok) {
          preview = 'MEMORY: analyzed recent post patterns'
        } else {
          status = 'queued'
          preview = `MEMORY run failed: ${JSON.stringify(run.json.errors ?? {}).slice(0, 120)}`
        }
      } else if (intent === 'crisis_check') {
        const run = await invokeWork(req, ['SENTRY'])
        if (run.ok) {
          preview = 'SENTRY: crisis scan completed'
        } else {
          status = 'queued'
          preview = `SENTRY run failed: ${JSON.stringify(run.json.errors ?? {}).slice(0, 120)}`
        }
      } else {
        const dispatch = await dispatchToAgent(targetCorp, targetAgent, { text: body.text })
        if (dispatch.preview) {
          preview = dispatch.preview
        } else {
          status = 'queued'
          preview = `No immediate output from ${targetCorp}/${targetAgent}; task queued.`
        }
      }
    } catch (err) {
      console.error('[command] dispatch error:', err)
      preview = `Dispatch error: ${String(err).slice(0, 100)}`
      status = 'queued'
    }
  }

  // Always log to agent_actions regardless of success/fail
  try {
    await db.insert(agentActions).values({
      agentName: 'sovereign',
      company: 'intelcore',
      actionType: 'command_dispatched',
      details: {
        commandId,
        text: body.text,
        targetCorp,
        targetAgent,
        intent,
        status,
        routingMethod,
        routingError,
      },
      outcome: status === 'needs_human' ? 'pending_human' : 'success',
    })
  } catch (dbErr) {
    console.error('[command] DB log failed:', dbErr)
  }

  const response: CommandResponse = {
    commandId,
    intent,
    routedTo: { corp: targetCorp, agent: targetAgent },
    status,
    preview: preview ?? (routingError ? `Routed via keyword fallback (Gemini error: ${routingError.slice(0, 80)})` : undefined),
  }

  return NextResponse.json(response)
}
