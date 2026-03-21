import { NextRequest, NextResponse } from "next/server";
import { fetchArticles } from "@/lib/scraper";
import { filterUnseen, markSeen } from "@/lib/dedup";
import { formatPost } from "@/lib/formatter";
import { generateImage } from "@/lib/image-gen";
import { publish } from "@/lib/publisher";
import { Article, SchedulerResponse } from "@/lib/types";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.AUTOMATE_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response: SchedulerResponse = { posted: 0, skipped: 0, errors: [] };

  // The Cloudflare Worker can send a single pre-filtered article,
  // or omit it to let Vercel scrape + dedup itself (fallback mode)
  let body: { article?: Article } = {};
  try {
    body = await req.json();
  } catch {
    // no body — run full scrape mode
  }

  let articles: Article[];

  if (body.article) {
    // Worker sent a single pre-deduped article
    articles = [body.article];
  } else {
    // Fallback: scrape + dedup on Vercel side
    try {
      const all = await fetchArticles();
      articles = await filterUnseen(all);
      response.skipped = all.length - articles.length;
    } catch (err: any) {
      return NextResponse.json(
        { error: `Scraper failed: ${err.message}` },
        { status: 500 }
      );
    }
  }

  for (const article of articles) {
    try {
      const igPost = formatPost(article, "instagram");
      const fbPost = formatPost(article, "facebook");
      const imageBuffer = await generateImage(article);
      const result = await publish({ ig: igPost, fb: fbPost }, imageBuffer);

      if (result.instagram.success && result.facebook.success) {
        await markSeen(article.id);
        response.posted++;
      } else {
        response.errors.push({
          articleId: article.id,
          message: JSON.stringify({
            ig: result.instagram.error,
            fb: result.facebook.error,
          }),
        });
      }
    } catch (err: any) {
      response.errors.push({ articleId: article.id, message: err.message });
    }
  }

  return NextResponse.json(response);
}
