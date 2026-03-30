export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { seedDefaultWorkflows } from '@/lib/defaultWorkflows'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { seeded, skipped } = await seedDefaultWorkflows()
  return NextResponse.json({ ok: true, seeded, skipped, total: seeded + skipped })
}
