/**
 * PPP TV Auto Poster — Cloudflare Worker
 *
 * - Cron: every 10 minutes
 * - Scrapes ppptv-v2.vercel.app directly (no RSS)
 * - Posts ONE latest article per run
 * - Deduplicates via Cloudflare KV (SEEN_ARTICLES)
 * - Calls Vercel /api/automate with article data
 */

const BASE_URL = "https://ppptv-v2.vercel.app";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runPipeline(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({ status: "ok", service: "PPP TV Auto Poster", cron: "*/10 * * * *" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.pathname === "/trigger") {
      ctx.waitUntil(runPipeline(env));
      return new Response(
        JSON.stringify({ status: "triggered" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.pathname === "/clear-cache" && request.method === "POST") {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${env.AUTOMATE_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
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

  // 1. Scrape latest article from website
  let article;
  try {
    article = await scrapeLatestArticle();
    if (!article) {
      console.log("[PPP TV] No article found on homepage");
      return;
    }
    console.log(`[PPP TV] Latest article: ${article.title}`);
  } catch (err) {
    console.error("[PPP TV] Scrape failed:", err.message);
    return;
  }

  // 2. Check if already posted
  const seen = await env.SEEN_ARTICLES.get(`seen:${article.id}`);
  if (seen) {
    console.log("[PPP TV] Already posted. Nothing new.");
    return;
  }

  // 3. Post via Vercel
  try {
    const result = await postArticle(article, env);
    if (result.success) {
      await env.SEEN_ARTICLES.put(`seen:${article.id}`, "1", {
        expirationTtl: TTL_SECONDS,
      });
      console.log(`[PPP TV] Posted: ${article.title}`);
    } else {
      console.warn(`[PPP TV] Post failed: ${result.error}`);
    }
  } catch (err) {
    console.error("[PPP TV] Post error:", err.message);
  }
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

// Direct HTML scraper — no RSS
async function scrapeLatestArticle() {
  const res = await fetch(BASE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 PPPTVAutoPoster/2.0" },
  });
  if (!res.ok) throw new Error(`Homepage fetch failed: ${res.status}`);
  const html = await res.text();

  // Find first /news/ link
  const linkMatch = html.match(/href=["'](\/news\/[^"'?#]+)["']/i);
  if (!linkMatch) return null;

  const articleUrl = `${BASE_URL}${linkMatch[1]}`;
  const articleRes = await fetch(articleUrl, {
    headers: { "User-Agent": "Mozilla/5.0 PPPTVAutoPoster/2.0" },
  });
  if (!articleRes.ok) return null;
  const articleHtml = await articleRes.text();

  const title = extractMeta(articleHtml, "og:title") || extractMeta(articleHtml, "twitter:title") || "";
  const imageUrl = extractMeta(articleHtml, "og:image") || extractMeta(articleHtml, "twitter:image") || "";
  const description = extractMeta(articleHtml, "og:description") || extractMeta(articleHtml, "description") || "";

  let category = "NEWS";
  const catMatch = articleUrl.match(/\/(celebrity|entertainment|music|sports|politics|lifestyle|tech|fashion|tv|film|gossip)\//i);
  if (catMatch) category = catMatch[1].toUpperCase();
  const catMeta = extractMeta(articleHtml, "article:section");
  if (catMeta) category = catMeta.toUpperCase();

  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(articleHtml)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text.length > 40) paragraphs.push(text);
  }

  if (!title) return null;

  const id = await sha256Short(articleUrl);

  return {
    id,
    title,
    url: articleUrl,
    imageUrl,
    summary: description.slice(0, 200) || paragraphs[0]?.slice(0, 200) || "",
    fullBody: paragraphs.slice(0, 20).join("\n\n") || description,
    sourceName: "PPP TV",
    category,
    publishedAt: new Date().toISOString(),
  };
}

function extractMeta(html, property) {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i"));
  return m ? m[1].trim() : "";
}

async function sha256Short(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
