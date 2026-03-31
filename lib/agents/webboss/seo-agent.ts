// CRAWL — WebBoss Tier 3 SEO agent
// Generates meta tags, structured data, and runs SEO audits every 7 days

import { BaseAgent, type TaskResult } from '../base'
import { aiRouter } from '../../ai/router'
import { logInfo } from '../../logger'
import { getDb, withRetry } from '../../db/client'
import type { Task } from '../../types'

const SEO_AUDIT_INTERVAL_DAYS = 7

export class CRAWL extends BaseAgent {
  readonly name = 'CRAWL'
  readonly tier = 3 as const
  readonly company = 'webboss' as const

  async execute(task: Task): Promise<TaskResult> {
    await this.setStatus('active')
    try {
      const taskData = task.result as Record<string, unknown> | undefined
      const pageContent = taskData?.content as string | undefined
      const pageUrl = taskData?.url as string | undefined

      // Generate SEO metadata
      const seoResponse = await aiRouter.route(
        'analyze',
        `Generate SEO metadata for this content:
        URL: ${pageUrl ?? 'https://euginemicah.com'}
        Content: ${pageContent ?? 'Eugine Micah - Media personality, entrepreneur, and youth empowerment advocate'}
        
        Provide:
        1. Meta title (50-60 characters)
        2. Meta description (150-160 characters)
        3. JSON-LD structured data for Person schema
        4. Primary keyword
        5. Secondary keywords (5 max)`,
        { role: 'CRAWL', platform: 'website' }
      )

      const seoData = seoResponse.content

      // Check if SEO audit is due (every 7 days)
      const auditDue = await this.isAuditDue()
      let auditResults: string | null = null

      if (auditDue || task.type === 'seo_audit') {
        logInfo(`[CRAWL] Running SEO audit`)
        const auditResponse = await aiRouter.route(
          'analyze',
          `Perform an SEO audit for Eugine Micah's website. Check:
          1. Content freshness and update frequency
          2. Keyword coverage across 10 content pillars
          3. Internal linking opportunities
          4. Page speed recommendations
          5. Mobile optimization status
          Provide actionable recommendations.`,
          { role: 'CRAWL', platform: 'website', auditType: 'full' }
        )
        auditResults = auditResponse.content
        await this.recordAuditTimestamp()
      }

      await this.setStatus('idle')
      return {
        success: true,
        data: {
          seoMetadata: seoData,
          auditResults,
          auditRan: auditDue || task.type === 'seo_audit',
        },
      }
    } catch (err) {
      this.handleError(err, task.id)
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async isAuditDue(): Promise<boolean> {
    try {
      const db = getDb()
      const rows = await db`
        SELECT created_at FROM memory_entries
        WHERE agent_name = ${this.name}
          AND tags @> '{"seo_audit"}'::text[]
        ORDER BY created_at DESC
        LIMIT 1
      `
      const lastAudit = (rows as Array<{ created_at: Date }>)[0]?.created_at
      if (!lastAudit) return true

      const daysSince = (Date.now() - new Date(lastAudit).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince >= SEO_AUDIT_INTERVAL_DAYS
    } catch {
      return true
    }
  }

  private async recordAuditTimestamp(): Promise<void> {
    await withRetry(async () => {
      const db = getDb()
      await db`
        INSERT INTO memory_entries (agent_name, context_summary, tags)
        VALUES (${this.name}, 'SEO audit completed', '{"seo_audit"}')
      `
    })
  }
}

export const crawl = new CRAWL()
