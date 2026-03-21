import { Redis } from "@upstash/redis";
import { Article } from "./types";

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export async function filterUnseen(articles: Article[]): Promise<Article[]> {
  if (articles.length === 0) return [];
  try {
    const redis = getRedis();
    const keys = articles.map((a) => `seen:${a.id}`);
    const results = await redis.mget<(string | null)[]>(...keys);
    return articles.filter((_, i) => results[i] === null);
  } catch (err) {
    console.warn("[dedup] KV unavailable, treating all as unseen:", err);
    return articles;
  }
}

export async function markSeen(articleId: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(`seen:${articleId}`, "1", { ex: TTL_SECONDS });
  } catch (err) {
    console.warn("[dedup] Failed to mark seen:", err);
  }
}

export async function hasSeen(articleId: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const val = await redis.get(`seen:${articleId}`);
    return val !== null;
  } catch {
    return false;
  }
}
