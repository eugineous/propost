import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/image-gen";
import { Article } from "@/lib/types";

// GET /api/preview-image?title=HEADLINE&category=CELEBRITY&imageUrl=...
// Use this to test the image template without needing social API tokens
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const article: Article = {
    id: "preview",
    title:
      searchParams.get("title") ??
      "BUFFY THE VAMPIRE SLAYER ACTOR NICHOLAS BRENDON DIES AGED 54",
    url: "https://ppptv-v2.vercel.app",
    imageUrl:
      searchParams.get("imageUrl") ??
      "https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/ded3/live/e1ecfce0-24c8-11f1-ad78-bf5290e8c730.jpg",
    summary: "Preview",
    fullBody: "Preview body",
    sourceName: "PPP TV",
    publishedAt: new Date(),
    category: (searchParams.get("category") ?? "TV & FILM").toUpperCase(),
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
