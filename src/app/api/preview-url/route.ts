import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/url-scraper";
import { generateAIContent } from "@/lib/gemini";
import { generateImage } from "@/lib/image-gen";
import { Article } from "@/lib/types";
import { createHash } from "crypto";

export const maxDuration = 60;

function typeToCategory(type: string, title: string): string {
  const t = title.toLowerCase();
  if (type === "youtube" || type === "tiktok") return "TV & FILM";
  if (type === "twitter") return "CELEBRITY";
  if (t.includes("music") || t.includes("song") || t.includes("album")) return "MUSIC";
  if (t.includes("fashion") || t.includes("style")) return "FASHION";
  if (t.includes("award") || t.includes("nomination")) return "AWARDS";
  return "GENERAL";
}

export async function POST(req: NextRequest) {
  let body: { url?: string; category?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { url, category } = body;
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  try {
    const scraped = await scrapeUrl(url);
    if (!scraped.title) return NextResponse.json({ error: "Could not extract content" }, { status: 422 });

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

    const ai = await generateAIContent(article);
    const articleWithAITitle = { ...article, title: ai.clickbaitTitle };
    const imageBuffer = await generateImage(articleWithAITitle, { isBreaking: false });

    return NextResponse.json({
      scraped: {
        type: scraped.type,
        title: scraped.title,
        description: scraped.description,
        imageUrl: scraped.imageUrl,
        sourceName: scraped.sourceName,
      },
      ai,
      category: article.category,
      imageBase64: imageBuffer.toString("base64"),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
