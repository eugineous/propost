// POST /api/workflows — execute a named workflow
// GET  /api/workflows — list all available workflows

import { NextRequest, NextResponse } from 'next/server'
import { WORKFLOWS } from '@/lib/workflows/engine'

export async function GET() {
  return NextResponse.json({
    workflows: Object.keys(WORKFLOWS),
    description: {
      AINEWS_SCRAPE: 'Fetch top AI stories and queue for posting',
      AINEWS_FORMAT: 'Format a raw AI story for all 6 platforms',
      AINEWS_POST: 'Post queued AI content at current EAT slot',
      AINEWS_AFRICA: 'Find and post AI story with Kenya/Africa angle',
      AINEWS_WEEKLY: 'Sunday AI Week in Review — LinkedIn + X thread',
      YOUTH_CONTENT: 'Monday youth empowerment content pipeline',
      ELITE_THREAD: 'Wednesday/Sunday elite conversation threads',
      TREND_REACT: 'React to trending topic — queues for approval',
      FASHION_POST: 'Instagram fashion content (3x/week)',
      WEEKLY_ROUNDUP: 'Sunday performance report and next week plan',
      CONTENT_CALENDAR: 'Fill any empty slots in today\'s content calendar',
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { workflow: string; params?: Record<string, string> }
    const { workflow, params } = body

    if (!workflow) {
      return NextResponse.json({ error: 'workflow name required' }, { status: 400 })
    }

    const runner = WORKFLOWS[workflow.toUpperCase()]
    if (!runner) {
      return NextResponse.json({
        error: `Unknown workflow: ${workflow}`,
        available: Object.keys(WORKFLOWS),
      }, { status: 404 })
    }

    const result = await runner(params)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Workflow failed' },
      { status: 500 }
    )
  }
}
