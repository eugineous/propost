// PULSE — PagePower Tier 3 analytics agent
// Detects high-performing posts and notifies SOVEREIGN and CHIEF

import { BaseAgent, type TaskResult } from '../base'
import { propostEvents } from '../../events'
import { logInfo } from '../../logger'
import { getDb } from '../../db/client'
import type { Task } from '../../types'

const REACTION_THRESHOLD = 50
const TIME_WINDOW_MS = 60 * 60 * 1000 // 1 hour

export class PULSE extends BaseAgent {
  readonly name = 'PULSE'
  readonly tier = 3 as const
  readonly company = 'pagepower' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      logInfo(`[PULSE] Checking Facebook post performance`, { taskId: task.id })

      // Query analytics snapshots for posts with >50 reactions in last hour
      const db = getDb()
      const oneHourAgo = new Date(Date.now() - TIME_WINDOW_MS)

      const rows = await db`
        SELECT post_id, SUM(value) as total_reactions
        FROM analytics_snapshots
        WHERE platform = 'facebook'
          AND metric_type IN ('likes', 'reactions')
          AND created_at >= ${oneHourAgo.toISOString()}
          AND post_id IS NOT NULL
        GROUP BY post_id
        HAVING SUM(value) > ${REACTION_THRESHOLD}
        ORDER BY total_reactions DESC
      `

      const viralPosts = rows as Array<{ post_id: string; total_reactions: bigint }>

      if (viralPosts.length > 0) {
        logInfo(`[PULSE] Detected ${viralPosts.length} high-performing posts`, {
          posts: viralPosts.map((p) => ({ postId: p.post_id, reactions: Number(p.total_reactions) })),
        })

        // Notify SOVEREIGN and CHIEF
        for (const post of viralPosts) {
          propostEvents.emit('alert', {
            type: 'viral_post',
            agentName: this.name,
            company: this.company,
            platform: 'facebook',
            postId: post.post_id,
            reactions: Number(post.total_reactions),
            message: `Facebook post ${post.post_id} has ${post.total_reactions} reactions in 1 hour`,
            notifyAgents: ['SOVEREIGN', 'CHIEF'],
            timestamp: new Date().toISOString(),
          })
        }
      }

      await this.setStatus('idle')
      return {
        success: true,
        data: {
          viralPostCount: viralPosts.length,
          posts: viralPosts.map((p) => ({ postId: p.post_id, reactions: Number(p.total_reactions) })),
        },
      }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}

export const pulse = new PULSE()
