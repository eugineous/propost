import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/url-scraper";
import { generateAIContent } from "@/lib/gemini";
import { generateImage } from "@/lib/image-gen";
import { publish } from "@/lib/publisher";
import { Article } from "@/lib/types";
import { createHash } from "crypto";

export const maxDuration = 120;

const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || "https://ppptv-worker.euginemicah.workers.dev";
const WORKER_SECRET = process.env.WORKER_SECRET || "";

async function logPost(entry: object): Promise<void> {
  if (!WORKER_SECRET) return;
  try {
    await fetch(WORKER_URL + "/post-log", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + WORKER_SECRET },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* non-fatal */ }
}

// Map URL type to article category
function typeToCategory(type: string, title: string): string {
  const t = title.toLowerCase();
  if (type === "youtube" || type === "tiktok") return "TV & FILM";
  if (type === "twitter") return "CELEBRITY";
  if (t.includes("music") || t.includes("song") || t.includes("album")) return "MUSIC";
  if (t.includes("fashion") || t.includes("style")) return "FASHION";
  if (t.includes("award") || t.includes("nomination")) return "AWARDS";
  if (t.includes("event") || t.includes("concert")) return "EVENTS";
  return "GENERAL";
}

export async function POST(req: NextRequest) {
  // Auth check
  const auth = req.headers.get("authorization");
  if (auth !== "Bearer " + process.env.AUTOMATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string; category?: string; dryRun?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { url, category, dryRun = false } = body;
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  try {
    // 1. Scrape the URL
    const scraped = await scrapeUrl(url);

    if (!scraped.title) {
      return NextResponse.json({ error: "Could not extract content from URL" }, { status: 422 });
    }

    // 2. Build an Article object from scraped content
    const article: Article = {
      id: createHash("sha256").update(url).digest("hex").slice(0, 16),
      title: scraped.title,
      url: scraped.sourceUrl,
      imageUrl: scraped.imageUrl || scraped.videoThumbnailUrl || "",
      summary: scraped.description,
      fullBody: scraped.description,
      sourceName: scraped.sourceName,
      category: category || typeToCategory(scraped.type, scraped.title),
      publishedAt: new Date(),
    };

    // 3. Generate AI clickbait title + caption
    const ai = await generateAIContent(article);

    // 4. Build the branded thumbnail image
    const articleWithAITitle = { ...article, title: ai.clickbaitTitle };
    const imageBuffer = await generateImage(articleWithAITitle, { isBreaking: false });

    // If dry run, return preview without posting
    if (dryRun) {
      return NextResponse.json({
        scraped,
        article,
        ai,
        imageBase64: imageBuffer.toString("base64"),
        message: "Dry run — not posted",
      });
    }

    // 5. Post to FB + IG
    const igPost = { platform: "instagram" as const, caption: ai.caption, articleUrl: article.url };
    const fbPost = { platform: "facebook" as const, caption: ai.caption, articleUrl: article.url };
    const result = await publish({ ig: igPost, fb: fbPost }, imageBuffer);

    const anySuccess = result.facebook.success || result.instagram.success;

    if (anySuccess) {
      await logPost({
        articleId: article.id,
        title: ai.clickbaitTitle,
        url: article.url,
        category: article.category,
        sourceType: scraped.type,
        instagram: result.instagram,
        facebook: result.facebook,
        postedAt: new Date().toISOString(),
        manualPost: true,
      });
    }

    return NextResponse.json({
      success: anySuccess,
      scraped: { type: scraped.type, title: scraped.title, sourceName: scraped.sourceName },
      ai: { clickbaitTitle: ai.clickbaitTitle },
      instagram: result.instagram,
      facebook: result.facebook,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
