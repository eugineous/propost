import { NextResponse } from "next/server";

const RSS_URL = "https://ppptv-v2.vercel.app/api/rss";

export const maxDuration = 30;

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
  const m = xml.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i"));
  return m ? m[1].trim() : "";
}

function extractCdata(raw: string): string {
  const m = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1].trim() : raw.replace(/<[^>]+>/g, "").trim();
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp("<" + tag + "[^>]*\\s" + attr + '="([^"]*)"', "i"));
  return m ? m[1] : "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];

    const title = extractCdata(extractTag(block, "title"));
    const link = extractCdata(extractTag(block, "link")) || extractTag(block, "link");
    const rawDesc = extractTag(block, "description");
    const description = stripHtml(extractCdata(rawDesc) || rawDesc).slice(0, 300);
    const category = extractCdata(extractTag(block, "category")) || "GENERAL";
    const pubDate = extractTag(block, "pubDate");

    // Try multiple image sources
    const imageUrl =
      extractAttr(block, "enclosure", "url") ||
      extractAttr(block, "media:content", "url") ||
      extractAttr(block, "media:thumbnail", "url") ||
      (() => {
        // Fallback: img tag inside description CDATA
        const raw = extractCdata(extractTag(block, "description"));
        const img = raw.match(/<img[^>]+src=["']([^"']+)["']/i);
        return img ? img[1] : "";
      })();

    if (!title || !link) continue;

    items.push({
      title,
      link,
      pubDate,
      description,
      imageUrl: imageUrl || undefined,
      category: category.toUpperCase(),
      sourceName: "PPP TV Kenya",
    });
  }

  return items;
}

export async function GET() {
  try {
    const res = await fetch(RSS_URL, {
      headers: {
        "User-Agent": "PPPTVAutoPoster/3.0",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `RSS fetch failed: HTTP ${res.status}`, items: [] },
        { status: 502 }
      );
    }

    const xml = await res.text();

    if (!xml || xml.trim().length < 50) {
      return NextResponse.json({ error: "Empty RSS response", items: [] }, { status: 502 });
    }

    const items = parseRss(xml);

    return NextResponse.json(
      { items, count: items.length, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message, items: [] }, { status: 500 });
  }
}
