import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/url-scraper";
import { generateImage } from "@/lib/image-gen";
import { publish } from "@/lib/publisher";
import { resolveVideoUrl } from "@/lib/video-downloader";
import { Article } from "@/lib/types";
import { createHash } from "crypto";

export const maxDuration = 180;

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
  } catch {}
}

// Download video to buffer — tries resolved URL first, then original
async function downloadVideo(sourceUrl: string): Promise<Buffer> {
  const resolved = await resolveVideoUrl(sourceUrl).catch(() => null);
  const fetchUrl = resolved?.url || sourceUrl;

  const res = await fetch(fetchUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PPPTVBot/1.0)" },
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`Video download failed: HTTP ${res.status} from ${fetchUrl}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: NextRequest) {

  let body: { url?: string; headline?: string; caption?: string; category?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { url, headline, caption, category = "GENERAL" } = body;
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
  if (!headline) return NextResponse.json({ error: "headline is required" }, { status: 400 });
  if (!caption) return NextResponse.json({ error: "caption is required" }, { status: 400 });

  try {
    const scraped = await scrapeUrl(url);
    const thumbnailUrl = scraped.videoThumbnailUrl || scraped.imageUrl || "";

    const article: Article = {
      id: createHash("sha256").update(url).digest("hex").slice(0, 16),
      title: headline,
      url: scraped.sourceUrl || url,
      imageUrl: thumbnailUrl,
      summary: caption,
      fullBody: caption,
      sourceName: scraped.sourceName || "PPP TV",
      category: category.toUpperCase(),
      publishedAt: new Date(),
    };

    // Generate branded thumbnail image
    const imageBuffer = await generateImage(article, { isBreaking: false });

    // Download video buffer — this is what gets uploaded to FB/IG
    const videoBuffer = await downloadVideo(url);

    // Use the branded thumbnail as cover for IG Reels
    // Upload it to FB CDN to get a hosted URL
    let coverImageUrl: string | undefined;
    try {
      const fbToken = process.env.FACEBOOK_ACCESS_TOKEN;
      const fbPageId = process.env.FACEBOOK_PAGE_ID;
      if (fbToken && fbPageId) {
        const blob = new Blob(
          [imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength) as ArrayBuffer],
          { type: "image/jpeg" }
        );
        const form = new FormData();
        form.append("source", blob, "cover.jpg");
        form.append("published", "false");
        form.append("access_token", fbToken);
        const res = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/photos`, { method: "POST", body: form });
        const data = await res.json() as any;
        if (res.ok && !data.error) {
          await new Promise(r => setTimeout(r, 4000));
          const photoRes = await fetch(`https://graph.facebook.com/v19.0/${data.id}?fields=images&access_token=${fbToken}`);
          const photoData = await photoRes.json() as any;
          coverImageUrl = photoData.images?.[0]?.source;
        }
      }
    } catch {}

    const igPost = { platform: "instagram" as const, caption, articleUrl: article.url };
    const fbPost = { platform: "facebook" as const, caption, articleUrl: article.url };
    const result = await publish({ ig: igPost, fb: fbPost }, imageBuffer, videoBuffer, coverImageUrl);

    const anySuccess = result.facebook.success || result.instagram.success;
    if (anySuccess) {
      await logPost({
        articleId: article.id, title: headline, url: article.url,
        category: article.category, sourceType: scraped.type,
        instagram: result.instagram, facebook: result.facebook,
        postedAt: new Date().toISOString(), manualPost: true, postType: "video",
      });
    }

    return NextResponse.json({ success: anySuccess, thumbnailUrl, instagram: result.instagram, facebook: result.facebook });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
