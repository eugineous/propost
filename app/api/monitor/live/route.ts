import { NextResponse } from "next/server";

const now = () => new Date();

export async function GET() {
  const ts = now().toISOString();
  // Mock but non-zero metrics to keep UI live until real tokens are wired
  const metrics = {
    instagram: { followers: 12840, posts: 312, engagement: 4.8, impressions: 182000 },
    x: { followers: 6840, posts: 2, engagement: 3.2, impressions: 32000 },
    linkedin: { followers: 2400, posts: 1, engagement: 2.1, impressions: 9500 },
    facebook: { followers: 15800, posts: 1, engagement: 2.4, impressions: 41000 },
  };

  const response = {
    timestamp: ts,
    actions: 9,
    posts: 0,
    trends: 8,
    agentsActive: 33,
    monetization: {
      goal: 5_000_000,
      current: 0,
    },
    metrics,
  };

  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}
