import { NextResponse } from "next/server";
import { fetchArticles } from "@/lib/scraper";
import { filterUnseen } from "@/lib/dedup";
import { formatPost } from "@/lib/formatter";
import { generateImage } from "@/lib/image-gen";

export const maxDuration = 60;

// Dry run: scrape + generate images but skip social API posting
// Safe to call without any social media tokens
export async function GET() {
  const results: Array<{
    id: string;
    title: string;
    category: string;
    imageGenerated: boolean;
    captionLength: { instagram: number; facebook: number };
    error?: string;
  }> = [];

  let articles;
  try {
    articles = await fetchArticles();
  } catch (err: any) {
    return NextResponse.json({ error: `Scraper failed: ${err.message}` }, { status: 500 });
  }

  // Try dedup — if Redis isn't configured, just use all articles (max 3 for dry run)
  let newArticles = articles;
  try {
    newArticles = await filterUnseen(articles);
  } catch {
    // Redis not configured yet — fine for dry run
  }

  // Only process first 3 articles in dry run to keep it fast
  const sample = newArticles.slice(0, 3);

  for (const article of sample) {
    try {
      const igPost = formatPost(article, "instagram");
      const fbPost = formatPost(article, "facebook");
      const imageBuffer = await generateImage(article);

      results.push({
        id: article.id,
        title: article.title,
        category: article.category,
        imageGenerated: imageBuffer.length > 0,
        captionLength: {
          instagram: igPost.caption.length,
          facebook: fbPost.caption.length,
        },
      });
    } catch (err: any) {
      results.push({
        id: article.id,
        title: article.title,
        category: article.category,
        imageGenerated: false,
        captionLength: { instagram: 0, facebook: 0 },
        error: err.message,
      });
    }
  }

  return NextResponse.json({
    totalArticlesFound: articles.length,
    newArticles: newArticles.length,
    dryRunSample: results,
    note: "No posts were made. Add social API tokens to enable posting.",
  });
}
