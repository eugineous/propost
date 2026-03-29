// ============================================================
// ProPost Empire — SCOUT scoutPoll
// ============================================================

import { getTrending } from '@/lib/platforms/x'
import { db } from '@/lib/db'
import { trends, agentActions } from '@/lib/schema'

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!
const CF_KV_AGENT_STATE_ID = process.env.CF_KV_AGENT_STATE_ID!
const CF_API_TOKEN = process.env.CF_API_TOKEN!
const TRENDS_CACHE_KEY = 'trends:KE:x_trending'
const TRENDS_TTL = 600 // 600 seconds

async function kvPut(key: string, value: string, ttl: number): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_AGENT_STATE_ID}/values/${encodeURIComponent(key)}?expiration_ttl=${ttl}`
  await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: value,
  })
}

export async function scoutPoll(): Promise<void> {
  const rawTrends = await getTrending('KE')

  if (rawTrends.length === 0) {
    console.warn('[scout] No trends returned from X API')
    return
  }

  // Cache in Cloudflare KV with 600s TTL
  await kvPut(
    TRENDS_CACHE_KEY,
    JSON.stringify({ trends: rawTrends, fetchedAt: new Date().toISOString() }),
    TRENDS_TTL
  )

  // Store results in trends table and emit trend_detected events
  for (const trend of rawTrends) {
    await db.insert(trends).values({
      trendText: trend.text,
      volume: trend.volume,
      region: 'KE',
      source: 'x_trending',
    }).onConflictDoNothing()

    // Emit trend_detected SSE event via DB insert to agent_actions
    await db.insert(agentActions).values({
      agentName: 'scout',
      company: 'xforce',
      actionType: 'trend_detected',
      details: {
        trendText: trend.text,
        volume: trend.volume,
        region: 'KE',
        source: 'x_trending',
      },
      outcome: 'success',
    })
  }
}
