/**
 * Deduplication via Cloudflare KV.
 *
 * The Cloudflare Worker calls /api/automate with a pre-filtered list of
 * unseen article IDs (dedup happens in the Worker using CF KV).
 *
 * This module is a no-op pass-through on the Vercel side — all articles
 * passed in are treated as new (the Worker already filtered them).
 *
 * If UPSTASH env vars are present (optional fallback), it uses those instead.
 */
import { Article } from "./types";

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

async function upstashAvailable(): Promise<boolean> {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export async function filterUnseen(articles: Article[]): Promise<Article[]> {
  if (articles.length === 0) return [];

  if (await upstashAvailable()) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      const keys = articles.map((a) => `seen:${a.id}`);
      const results = await redis.mget<(string | null)[]>(...keys);
      return articles.filter((_, i) => results[i] === null);
    } catch (err) {
      console.warn("[dedup] Upstash unavailable, passing all through:", err);
    }
  }

  // No KV configured on Vercel side — Worker handles dedup via CF KV
  return articles;
}

export async function markSeen(articleId: string): Promise<void> {
  if (await upstashAvailable()) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      await redis.set(`seen:${articleId}`, "1", { ex: TTL_SECONDS });
    } catch (err) {
      console.warn("[dedup] Failed to mark seen:", err);
    }
  }
  // If no Upstash, Worker marks seen in CF KV after getting success response
}

export async function hasSeen(articleId: string): Promise<boolean> {
  if (await upstashAvailable()) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      const val = await redis.get(`seen:${articleId}`);
      return val !== null;
    } catch {
      return false;
    }
  }
  return false;
}
