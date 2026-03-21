import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/image-gen";
import { Article } from "@/lib/types";

// GET /api/preview-image
// Optional params: title, category, imageUrl
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const article: Article = {
    id: "preview",
    title:
      searchParams.get("title") ??
      "JAY-Z & ERYKAH BADU ARE HEADLINING ROOTS PICNIC THIS SUMMER",
    url: "https://ppptv-v2.vercel.app",
    imageUrl:
      searchParams.get("imageUrl") ??
      "https://deadline.com/wp-content/uploads/2026/03/Chuck-Norris-Donald-Trump-2-shot.jpg",
    summary: searchParams.get("summary") ?? "Do y'all think we're getting new music soon?",
    fullBody: "Preview body",
    sourceName: "PPP TV",
    publishedAt: new Date(),
    category: (searchParams.get("category") ?? "NEWS").toUpperCase(),
  };

  try {
    const buffer = await generateImage(article);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
