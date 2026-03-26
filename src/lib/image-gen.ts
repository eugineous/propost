import satori from "satori";
import sharp from "sharp";
import { Article } from "./types";

const W = 1080, H = 1350; // 4:5 ratio
const WHITE = "#FFFFFF", BLACK = "#000000";

// Category accent colors — matching PPP TV site
const CAT_COLORS: Record<string, string> = {
  NEWS:          "#FF007A",
  POLITICS:      "#FF007A",
  ENTERTAINMENT: "#BF00FF",
  MUSIC:         "#FF6B00",
  SPORTS:        "#00CFFF",
  LIFESTYLE:     "#00FF94",
  TECHNOLOGY:    "#FFE600",
  BUSINESS:      "#00CFFF",
  HEALTH:        "#00FF94",
  MOVIES:        "#BF00FF",
  SCIENCE:       "#FFE600",
  GENERAL:       "#FF007A",
  CELEBRITY:     "#BF00FF",
  "TV & FILM":   "#BF00FF",
  FASHION:       "#FF6B00",
  EVENTS:        "#00FF94",
  AWARDS:        "#FFE600",
  "EAST AFRICA": "#FF007A",
};

function getCatColor(category: string): string {
  return CAT_COLORS[category.toUpperCase()] ?? "#FF007A";
}

let _fontCache: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  if (_fontCache) return _fontCache;
  const sources = [
    "https://cdn.jsdelivr.net/npm/@fontsource/bebas-neue@5.0.8/files/bebas-neue-latin-400-normal.woff",
    "https://cdn.jsdelivr.net/npm/@fontsource/oswald@5.0.8/files/oswald-latin-700-normal.woff",
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (res.ok) { _fontCache = await res.arrayBuffer(); return _fontCache; }
    } catch { /* try next */ }
  }
  throw new Error("Could not load font");
}

// All headline words in white — clean, no accent word logic
function buildHeadlineSpans(title: string) {
  const words = title.toUpperCase().split(/\s+/);
  return words.map((word, i) => ({
    type: "span" as const,
    props: {
      style: { color: WHITE, marginRight: i < words.length - 1 ? 10 : 0 },
      children: word,
    },
  }));
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch { return null; }
}

// PPP TV logo — top-left, white text
function buildLogo() {
  return {
    type: "div",
    props: {
      style: {
        display: "flex", flexDirection: "column" as const, alignItems: "flex-start",
        position: "absolute" as const, top: 44, left: 44,
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex", alignItems: "center",
              background: "rgba(0,0,0,0.65)", borderRadius: 6,
              paddingLeft: 16, paddingRight: 20, paddingTop: 10, paddingBottom: 10,
            },
            children: [
              { type: "span", props: { style: { color: WHITE, fontSize: 48, fontWeight: 700, letterSpacing: 2, lineHeight: 1 }, children: "PPP" } },
              { type: "span", props: { style: { color: "#F5A623", fontSize: 48, fontWeight: 700, letterSpacing: 2, lineHeight: 1, marginLeft: 6 }, children: "TV" } },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 700, letterSpacing: 8, marginTop: 4, marginLeft: 18 },
            children: [{ type: "span", props: { style: { color: WHITE }, children: "KENYA" } }],
          },
        },
      ],
    },
  };
}

export interface ImageOptions {
  isBreaking?: boolean;
  storyFormat?: boolean;
}

export async function generateImage(article: Article, opts: ImageOptions = {}): Promise<Buffer> {
  if (!article.imageUrl || article.imageUrl.trim() === "") {
    throw new Error("NO_IMAGE: article has no imageUrl — skipping");
  }

  const [fontData, rawBg] = await Promise.all([
    loadFont(),
    fetchImageBuffer(article.imageUrl),
  ]);

  if (!rawBg) {
    throw new Error("NO_IMAGE: could not fetch imageUrl — skipping");
  }

  // Resize bg to 1080×1350 (4:5), crop from top to keep faces
  const resized = await sharp(rawBg)
    .resize(W, H, { fit: "cover", position: "top" })
    .jpeg({ quality: 88 })
    .toBuffer();
  const bgBase64 = `data:image/jpeg;base64,${resized.toString("base64")}`;

  const category = article.category.toUpperCase();
  const accent = getCatColor(category);
  const headlineSpans = buildHeadlineSpans(article.title);

  // Font size based on headline length
  const charCount = article.title.length;
  const wordCount = article.title.split(/\s+/).length;
  let headlineFontSize: number;
  if (charCount <= 40) headlineFontSize = 118;
  else if (charCount <= 55) headlineFontSize = 100;
  else if (charCount <= 70) headlineFontSize = 86;
  else if (charCount <= 85) headlineFontSize = 74;
  else if (charCount <= 100) headlineFontSize = 64;
  else if (charCount <= 120) headlineFontSize = 56;
  else headlineFontSize = 48;
  if (wordCount > 12 && headlineFontSize > 60) headlineFontSize = Math.min(headlineFontSize, 60);
  if (wordCount > 16 && headlineFontSize > 50) headlineFontSize = Math.min(headlineFontSize, 50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svg = await (satori as any)(
    {
      type: "div",
      props: {
        style: {
          display: "flex", flexDirection: "column",
          width: W, height: H,
          position: "relative", backgroundColor: BLACK, overflow: "hidden",
          fontFamily: "BebasNeue",
        },
        children: [
          // Full-bleed background image
          {
            type: "img",
            props: {
              src: bgBase64,
              style: { position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover", objectPosition: "center top" },
            },
          },

          // Gradient overlay — transparent top, solid black at bottom ~65%
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                position: "absolute", left: 0, right: 0, top: 0, height: H,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.92) 65%, rgba(0,0,0,1) 78%)",
              },
              children: [],
            },
          },

          // Category accent bar at very top
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                position: "absolute", top: 0, left: 0, right: 0, height: 8,
                backgroundColor: accent,
              },
              children: [],
            },
          },

          // PPP TV logo — top left
          buildLogo(),

          // Bottom content block
          {
            type: "div",
            props: {
              style: {
                display: "flex", flexDirection: "column", alignItems: "flex-start",
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "0 44px 52px 44px",
              },
              children: [
                // Category pill — rounded, colored background
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex", alignSelf: "flex-start",
                      backgroundColor: accent,
                      paddingLeft: 24, paddingRight: 24, paddingTop: 10, paddingBottom: 10,
                      borderRadius: 50, marginBottom: 24,
                    },
                    children: [{
                      type: "span",
                      props: {
                        style: { color: BLACK, fontSize: 30, fontWeight: 700, letterSpacing: 4, lineHeight: 1 },
                        children: category,
                      },
                    }],
                  },
                },

                // Headline — white, all caps, Bebas Neue
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex", flexWrap: "wrap",
                      fontSize: headlineFontSize, fontWeight: 400,
                      lineHeight: 0.92, letterSpacing: 1, marginBottom: 0,
                    },
                    children: headlineSpans,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { width: W, height: H, fonts: [{ name: "BebasNeue", data: fontData, weight: 400, style: "normal" }] }
  );

  return sharp(Buffer.from(svg)).resize(W, H).jpeg({ quality: 93 }).toBuffer();
}
