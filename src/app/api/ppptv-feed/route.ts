import { NextResponse } from "next/server";

const RSS_URL = "https://ppptv-v2.vercel.app/api/rss";

export const revalidate = 300; // cache 5 min

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  imageUrl?: string;
  category?: string;
  sourceName?: string;
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i").exec(xml);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i").exec(xml);
  return plain ? plain[1].trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["']`, "i");
  const m = re.exec(xml);
  return m ? m[1].trim() : "";
}

function parseItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];

    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractAttr(block, "guid", "isPermaLink") || extractTag(block, "guid");
    const pubDate = extractTag(block, "pubDate");
    const description = extractTag(block, "description");
    const category = extractTag(block, "category");

    // Image: try media:content, enclosure, og:image in description
    let imageUrl =
      extractAttr(block, "media:content", "url") ||
      extractAttr(block, "enclosure", "url") ||
      extractAttr(block, "media:thumbnail", "url") ||
      "";

    // Fallback: look for img src in description
    if (!imageUrl) {
      const imgMatch = /<img[^>]+src=["']([^"']+)["']/i.exec(description);
      if (imgMatch) imageUrl = imgMatch[1];
    }

    // Source name from channel or dc:creator
    const sourceName = extractTag(block, "dc:creator") || extractTag(block, "author") || "PPP TV";

    if (title && link) {
      items.push({ title, link, pubDate, description: description.replace(/<[^>]+>/g, "").slice(0, 200), imageUrl, category: category || "GENERAL", sourceName });
    }
  }

  return items;
}

export async function GET() {
  try {
    const res = await fetch(RSS_URL, {
      headers: { "Accept": "application/rss+xml, application/xml, text/xml, */*" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `RSS fetch failed: HTTP ${res.status}` }, { status: 502 });
    }

    const xml = await res.text();
    const items = parseItems(xml);

    return NextResponse.json({ items, count: items.length, fetchedAt: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
