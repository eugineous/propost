/**
 * PPP TV Auto Poster — Cloudflare Worker
 *
 * Responsibilities:
 *  1. Cron: fires every 30 minutes
 *  2. Fetches RSS from ppptv-v2.vercel.app/api/rss
 *  3. Deduplicates using Cloudflare KV (SEEN_ARTICLES binding)
 *  4. For each new article, calls Vercel /api/automate with article data
 *  5. Marks successfully posted articles as seen in KV
 *
 * KV namespace binding: SEEN_ARTICLES
 * Secrets (set via wrangler secret put):
 *   VERCEL_APP_URL   — https://your-app.vercel.app
 *   AUTOMATE_SECRET  — same as Vercel env var
 */

const RSS_URL = "https://ppptv-v2.vercel.app/api/rss";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export default {
  // Cron trigger
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runPipeline(env));
  },

  // Manual HTTP trigger
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({ status: "ok", service: "PPP TV Auto Poster" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Manual trigger
    if (url.pathname === "/trigger") {
      ctx.waitUntil(runPipeline(env));
      return new Response(
        JSON.stringify({ status: "triggered", message: "Pipeline started" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Clear seen cache (useful for testing)
    if (url.pathname === "/clear-cache" && request.method === "POST") {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${env.AUTOMATE_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      // List and delete all seen: keys
      const list = await env.SEEN_ARTICLES.list({ prefix: "seen:" });
      await Promise.all(list.keys.map((k) => env.SEEN_ARTICLES.delete(k.name)));
      return new Response(
        JSON.stringify({ cleared: list.keys.length }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Not found", { status: 404 });
  },
};

async function runPipeline(env) {
  console.log("[PPP TV] Pipeline started");

  // 1. Fetch RSS feed
  let articles;
  try {
    articles = await fetchRSS();
    console.log(`[PPP TV] Fetched ${articles.length} articles from RSS`);
  } catch (err) {
    console.error("[PPP TV] RSS fetch failed:", err.message);
    return;
  }

  // 2. Filter unseen via CF KV
  const unseen = [];
  for (const article of articles) {
    const seen = await env.SEEN_ARTICLES.get(`seen:${article.id}`);
    if (!seen) unseen.push(article);
  }
  console.log(`[PPP TV] ${unseen.length} new articles to post`);

  if (unseen.length === 0) {
    console.log("[PPP TV] Nothing new. Done.");
    return;
  }

  // 3. Post each new article via Vercel
  let posted = 0;
  const errors = [];

  for (const article of unseen) {
    try {
      const result = await postArticle(article, env);

      if (result.success) {
        // Mark as seen in CF KV
        await env.SEEN_ARTICLES.put(`seen:${article.id}`, "1", {
          expirationTtl: TTL_SECONDS,
        });
        posted++;
        console.log(`[PPP TV] Posted: ${article.title}`);
      } else {
        errors.push({ id: article.id, error: result.error });
        console.warn(`[PPP TV] Failed: ${article.title} — ${result.error}`);
      }
    } catch (err) {
      errors.push({ id: article.id, error: err.message });
      console.error(`[PPP TV] Error on ${article.id}:`, err.message);
    }
  }

  console.log(`[PPP TV] Done. Posted: ${posted}, Errors: ${errors.length}`);
}

async function postArticle(article, env) {
  const res = await fetch(`${env.VERCEL_APP_URL}/api/automate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AUTOMATE_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ article }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `HTTP ${res.status}: ${text}` };
  }

  const data = await res.json();
  return { success: data.posted > 0, error: data.errors?.[0]?.message };
}

// Minimal RSS parser (no npm in CF Workers)
async function fetchRSS() {
  const res = await fetch(RSS_URL, {
    headers: { "User-Agent": "PPPTVAutoPoster/1.0" },
  });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);

  const xml = await res.text();
  const items = [];

  // Parse <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const description = extractTag(block, "description");
    const pubDate = extractTag(block, "pubDate");
    const category = extractTag(block, "category");

    // Extract image from media:content or enclosure
    const mediaUrl =
      extractAttr(block, "media:content", "url") ||
      extractAttr(block, "enclosure", "url") ||
      "";

    if (!title || !link) continue;

    // Derive canonical URL from base64 slug
    const slugMatch = link.match(/\/news\/([A-Za-z0-9+/=_-]+)$/);
    let canonicalUrl = link;
    if (slugMatch) {
      try {
        canonicalUrl = atob(slugMatch[1]);
      } catch {
        canonicalUrl = link;
      }
    }

    const id = await sha256Short(canonicalUrl);

    items.push({
      id,
      title: title.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
      url: canonicalUrl,
      detailUrl: link,
      imageUrl: mediaUrl,
      summary: description
        ? description.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim().slice(0, 200)
        : "",
      category: category
        ? category.replace(/<!\[CDATA\[|\]\]>/g, "").trim().toUpperCase()
        : "GENERAL",
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      sourceName: "PPP TV",
    });
  }

  return items;
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

function extractAttr(xml, tag, attr) {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i"));
  return match ? match[1] : "";
}

async function sha256Short(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
