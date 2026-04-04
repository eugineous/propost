import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Dashboard is protected by Vercel deployment — no additional auth needed.
// All routes pass through freely.
export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
