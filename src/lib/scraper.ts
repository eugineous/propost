import { createHash } from "crypto";
import { Article } from "./types";

// Scrape the PPP TV website directly — no RSS feed
const BASE_URL = "https://ppptv-v2.vercel.app";

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function extractMeta(html: string, property: string): string {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i"));
  return m ? m[1].trim() : "";
}

function extractAttr(html: string, tag: string, attr: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["']`, "i"));
  return m ? m[1] : "";
}

// Scrape the homepage to get the latest article URL + metadata
async function scrapeHomepage(): Promise<{ url: string; title: string; imageUrl: string; category: string } | null> {
  const res = await fetch(BASE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 PPPTVAutoPoster/2.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Homepage fetch failed: ${res.status}`);
  const html = await res.text();

  // Find article links — look for /news/ paths
  const linkRegex = /href=["'](\/news\/[^"'?#]+)["']/gi;
  const seen = new Set<string>();
  const links: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    const path = m[1];
    if (!seen.has(path)) {
      seen.add(path);
      links.push(path);
    }
  }

  if (links.length === 0) return null;

  // Take the first (most recent) article
  const articlePath = links[0];
  const articleUrl = `${BASE_URL}${articlePath}`;

  // Try to get title/image from homepage HTML near the link
  // Look for og:title or first h2/h3 near the link
  const ogTitle = extractMeta(html, "og:title");
  const ogImage = extractMeta(html, "og:image");

  return {
    url: articleUrl,
    title: ogTitle || "",
    imageUrl: ogImage || "",
    category: "NEWS",
  };
}

// Scrape a single article page for full content
async function scrapeArticle(url: string): Promise<Article | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 PPPTVAutoPoster/2.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const html = await res.text();

  // Extract metadata
  const title =
    extractMeta(html, "og:title") ||
    extractMeta(html, "twitter:title") ||
    (() => {
      const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      return m ? stripHtml(m[1]) : "";
    })();

  const imageUrl =
    extractMeta(html, "og:image") ||
    extractMeta(html, "twitter:image") ||
    extractAttr(html, "img", "src");

  const description =
    extractMeta(html, "og:description") ||
    extractMeta(html, "twitter:description") ||
    extractMeta(html, "description");

  // Extract category from URL path or meta
  let category = "NEWS";
  const catMatch = url.match(/\/(celebrity|entertainment|music|sports|politics|lifestyle|tech|fashion|tv|film|gossip)\//i);
  if (catMatch) category = catMatch[1].toUpperCase();

  // Also check for category in page content
  const catMeta = extractMeta(html, "article:section") || extractMeta(html, "category");
  if (catMeta) category = catMeta.toUpperCase();

  // Extract article body paragraphs
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = pRegex.exec(html)) !== null) {
    const text = stripHtml(pm[1]);
    if (text.length > 40) paragraphs.push(text);
  }
  const fullBody = paragraphs.slice(0, 20).join("\n\n");

  if (!title) return null;

  return {
    id: hashUrl(url),
    title,
    url,
    imageUrl: imageUrl || "",
    summary: description ? description.slice(0, 200) : paragraphs[0]?.slice(0, 200) || "",
    fullBody: fullBody || description || "",
    sourceName: "PPP TV",
    category,
    publishedAt: new Date(),
  };
}

// Main export — returns ONE latest article
export async function fetchLatestArticle(): Promise<Article | null> {
  const hint = await scrapeHomepage();
  if (!hint) return null;

  const article = await scrapeArticle(hint.url);
  if (!article) return null;

  // Use homepage image if article page didn't have one
  if (!article.imageUrl && hint.imageUrl) {
    article.imageUrl = hint.imageUrl;
  }
  if (!article.title && hint.title) {
    article.title = hint.title;
  }

  return article;
}

// Legacy export for dry-run compatibility — returns array with one article
export async function fetchArticles(): Promise<Article[]> {
  const article = await fetchLatestArticle();
  return article ? [article] : [];
}
