import { NextRequest, NextResponse } from "next/server";

// This proxy adds the AUTOMATE_SECRET server-side so it's never exposed to the browser.
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const secret = process.env.AUTOMATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "AUTOMATE_SECRET not configured" }, { status: 500 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://auto-news-station.vercel.app";

  const res = await fetch(`${baseUrl}/api/post-from-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(115000),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
