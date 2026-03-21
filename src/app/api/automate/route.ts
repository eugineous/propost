import { NextRequest, NextResponse } from "next/server";
import { fetchArticles } from "@/lib/scraper";
import { filterUnseen, markSeen } from "@/lib/dedup";
import { formatPost } from "@/lib/formatter";
import { generateImage } from "@/lib/image-gen";
import { publish } from "@/lib/publisher";
import { SchedulerResponse } from "@/lib/types";

export const maxDuration = 300; // 5 min timeout for Vercel

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.AUTOMATE_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response: SchedulerResponse = { posted: 0, skipped: 0, errors: [] };

  let articles;
  try {
    articles = await fetchArticles();
  } catch (err: any) {
    return NextResponse.json(
      { error: `Scraper failed: ${err.message}` },
      { status: 500 }
    );
  }

  const newArticles = await filterUnseen(articles);
  response.skipped = articles.length - newArticles.length;

  for (const article of newArticles) {
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
