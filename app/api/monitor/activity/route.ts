import { NextResponse } from "next/server";

let counter = 0;

const baseFeed = [
  { actor: "scout", message: "Found 8 trending topics in Kenya", type: "trends" },
  { actor: "scribe", message: "Daily SITREP generated for Eugine", type: "brief" },
  { actor: "chat", message: "Replied to 12 of 47 DMs", type: "dm" },
  { actor: "blaze", message: "Drafted 3 posts for X", type: "content" },
  { actor: "hawk", message: "Ran policy check on 3 drafts", type: "safety" },
  { actor: "sentry", message: "No crises detected; monitoring", type: "crisis" },
];

export async function GET() {
  const now = new Date();
  counter += 1;

  const feed = baseFeed.map((item, idx) => ({
    id: `${counter}-${idx}`,
    actor: item.actor,
    message: item.message,
    type: item.type,
    at: new Date(now.getTime() - idx * 90_000).toISOString(),
  }));

  return NextResponse.json({ feed, status: "connected", generatedAt: now.toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
