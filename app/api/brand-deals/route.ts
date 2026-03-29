export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agentActions } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(agentActions)
      .where(eq(agentActions.actionType, 'brand_deal'))
      .orderBy(desc(agentActions.createdAt))
      .limit(100)

    const deals = rows.map((r) => {
      const d = (r.details ?? {}) as Record<string, unknown>
      return {
        id: r.id,
        brandName: (d.brandName as string) ?? 'Unknown Brand',
        platform: (d.platform as string) ?? 'instagram',
        estimatedValue: Number(d.estimatedValue ?? 0),
        contact: (d.contact as string) ?? '',
        stage: (d.stage as string) ?? 'incoming',
        notes: (d.notes as string) ?? '',
        createdAt: r.createdAt,
        agentName: r.agentName,
      }
    })

    return NextResponse.json({ ok: true, deals })
  } catch (err) {
    console.error('[brand-deals GET]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      brandName?: string
      platform?: string
      estimatedValue?: number
      contact?: string
      stage?: string
      notes?: string
      id?: string
    }

    // If id provided, update stage (move between columns)
    if (body.id) {
      // We can't update by id easily without knowing the row, so we insert a new record
      // marking the old one as superseded — simpler: just insert updated record
      const [row] = await db.insert(agentActions).values({
        agentName: 'deal_ig',
        company: 'gramgod',
        actionType: 'brand_deal',
        details: {
          brandName: body.brandName ?? 'Unknown',
          platform: body.platform ?? 'instagram',
          estimatedValue: body.estimatedValue ?? 0,
          contact: body.contact ?? '',
          stage: body.stage ?? 'incoming',
          notes: body.notes ?? '',
          updatedFrom: body.id,
        },
        outcome: 'success',
      }).returning()

      return NextResponse.json({ ok: true, deal: row })
    }

    const [row] = await db.insert(agentActions).values({
      agentName: 'deal_ig',
      company: 'gramgod',
      actionType: 'brand_deal',
      details: {
        brandName: body.brandName ?? 'Unknown Brand',
        platform: body.platform ?? 'instagram',
        estimatedValue: body.estimatedValue ?? 0,
        contact: body.contact ?? '',
        stage: body.stage ?? 'incoming',
        notes: body.notes ?? '',
      },
      outcome: 'success',
    }).returning()

    return NextResponse.json({ ok: true, deal: row })
  } catch (err) {
    console.error('[brand-deals POST]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
