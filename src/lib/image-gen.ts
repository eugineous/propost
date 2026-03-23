import satori from "satori";
import sharp from "sharp";
import { Article } from "./types";

const W = 1080, H = 1350;
const PINK = "#FF007A", WHITE = "#FFFFFF", BLACK = "#000000", RED = "#E50000";
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

// Stop-words — these are never highlighted
const STOP_WORDS = new Set([
  "A","AN","THE","AND","OR","BUT","IN","ON","AT","TO","FOR","OF","WITH","BY","FROM",
  "AS","IS","ARE","WAS","WERE","BE","BEEN","BEING","HAVE","HAS","HAD","DO","DOES",
  "DID","WILL","WOULD","COULD","SHOULD","MAY","MIGHT","SHALL","CAN","NOW","NOT","NO",
  "SO","IF","THEN","THAT","THIS","THESE","THOSE","AFTER","BEFORE","DURING","OVER",
  "UNDER","ABOUT","INTO","THROUGH","BETWEEN","AMONG","AGAINST","ALONG","AROUND",
  "REPORTEDLY","ALLEGEDLY","SAYS","SAID","DIES","DEAD","PASSES","AWAY","JOINS",
  "ADDS","SETS","GETS","PUTS","TAKES","MAKES","GIVES","GOES","COMES","RETURNS",
  "RELEASES","DROPS","LAUNCHES","OPENS","CLOSES","WINS","LOSES","BEATS","HITS",
  "TOPS","LEADS","HEADS","SIGNS","LANDS","BOARDS","TALKS","CALLS","TELLS","SHOWS",
  "REVEALS","CONFIRMS","DENIES","ADDRESSES","REACTS","RESPONDS","EXPLAINS",
  "ANNOUNCES","YOU","HE","SHE","IT","WE","THEY","HIS","HER","ITS","OUR","THEIR",
  "YOUR","MY","WHO","WHAT","WHERE","WHEN","HOW","WHY","WHICH","ALLOW","ALLOWS",
  "ALLOWED","KEEP","KEEPS","KEPT","WANT","WANTS","WANTED","NEED","NEEDS","NEEDED",
  "ALSO","JUST","STILL","EVEN","ONLY","BOTH","ALL","EACH","MORE","MOST","LESS",
  "LEAST","VERY","TOO","QUITE","NEW","OLD","FIRST","LAST","NEXT","SAME","OTHER",
  "UP","DOWN","OUT","OFF","BACK","AGAIN","WHILE","SINCE","UNTIL","THOUGH",
  "ALTHOUGH","BECAUSE","WHETHER","VS","VS.","OVER","AFTER","BEFORE",
]);

// Action/verb words that are less interesting as highlights
const WEAK_WORDS = new Set([
  "SAYS","SAID","DIES","DEAD","PASSES","AWAY","JOINS","ADDS","SETS","GETS","PUTS",
  "TAKES","MAKES","GIVES","GOES","COMES","RETURNS","RELEASES","DROPS","LAUNCHES",
  "OPENS","CLOSES","WINS","LOSES","BEATS","HITS","TOPS","LEADS","HEADS","SIGNS",
  "LANDS","BOARDS","TALKS","CALLS","TELLS","SHOWS","REVEALS","CONFIRMS","DENIES",
  "ADDRESSES","REACTS","RESPONDS","EXPLAINS","ANNOUNCES","BREAKS","SLAMS","FIRES",
  "HITS","BLASTS","SLAPS","CLAPS","BACK","AMID","AFTER","OVER","INSIDE","BEHIND",
]);

/**
 * Pick 1-2 accent words from the headline.
 * Strategy: prefer proper nouns (all-caps words 3+ chars that aren't stop/weak words),
 * then fall back to the longest meaningful word.
 */
function pickAccentWords(words: string[]): Set<number> {
  const clean = words.map(w => w.replace(/[^A-Z0-9']/g, ""));

  // Score each word — higher = better accent candidate
  const scores = clean.map((w, i) => {
    if (w.length < 3) return -1;
    if (STOP_WORDS.has(w)) return -1;
    if (WEAK_WORDS.has(w)) return 0;
    let score = w.length; // longer = more specific
    // Boost words that look like proper nouns (mixed case in original, or all-caps short)
    if (/^[A-Z][A-Z]+$/.test(words[i]) && w.length >= 4) score += 5;
    // Boost numbers / years
    if (/^\d/.test(w)) score += 3;
    // Boost words with apostrophes (names like O'BRIEN)
    if (w.includes("'")) score += 2;
    // Penalise position — words at start of sentence are often less specific
    if (i === 0) score -= 2;
    return score;
  });

  // Sort indices by score descending, pick top 2
  const ranked = scores
    .map((s, i) => ({ i, s }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s);

  const picked = new Set<number>();
  for (const { i } of ranked.slice(0, 2)) picked.add(i);
  return picked;
}

// Every leaf must be a span with display:flex wrapper — satori rule
function buildHeadlineSpans(title: string) {
  const words = title.toUpperCase().split(/\s+/);
  const accentIndices = pickAccentWords(words);
  return words.map((word, i) => ({
    type: "span" as const,
    props: {
      style: { color: accentIndices.has(i) ? PINK : WHITE, marginRight: i < words.length - 1 ? 10 : 0 },
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

function buildGradientBg(category: string) {
  const catColors: Record<string, string> = {
    MUSIC: "#1a0033", CELEBRITY: "#1a0010", "TV & FILM": "#001a1a",
    FASHION: "#1a001a", EVENTS: "#001a00", AWARDS: "#1a1000", GENERAL: "#0d0d1a",
  };
  const base = catColors[category] || "#0d0d1a";
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        position: "absolute" as const, top: 0, left: 0, width: W, height: H,
        background: `linear-gradient(135deg, ${base} 0%, #000000 40%, #1a0010 70%, #FF007A22 100%)`,
      },
      children: [],
    },
  };
}

function buildBreakingBanner() {
  return {
    type: "div",
    props: {
      style: {
        display: "flex", alignItems: "center",
        position: "absolute" as const, top: 0, left: 0, right: 0,
        backgroundColor: RED, paddingTop: 14, paddingBottom: 14,
        paddingLeft: 44, paddingRight: 44,
      },
      children: [{
        type: "span",
        props: {
          style: { color: WHITE, fontSize: 28, fontWeight: 700, letterSpacing: 6 },
          children: "BREAKING NEWS",
        },
      }],
    },
  };
}

function buildLogo(top: number) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex", flexDirection: "column" as const, alignItems: "flex-start",
        position: "absolute" as const, top, left: 44,
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex", alignItems: "center",
              background: "rgba(0,0,0,0.72)", borderRadius: 6,
              paddingLeft: 16, paddingRight: 20, paddingTop: 10, paddingBottom: 10,
              borderLeft: `5px solid ${PINK}`,
            },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", width: 14, height: 14, borderRadius: "50%", backgroundColor: PINK, marginRight: 12, flexShrink: 0 },
                  children: [],
                },
              },
              { type: "span", props: { style: { color: WHITE, fontSize: 52, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }, children: "PPP" } },
              { type: "span", props: { style: { color: PINK, fontSize: 52, fontWeight: 700, letterSpacing: 3, lineHeight: 1, marginLeft: 6 }, children: "TV" } },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", color: WHITE, fontSize: 16, fontWeight: 700, letterSpacing: 8, marginTop: 5, marginLeft: 22, opacity: 0.85 },
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
  // ── Require image — skip articles with no imageUrl ──────────────────────────
  if (!article.imageUrl || article.imageUrl.trim() === "") {
    throw new Error("NO_IMAGE: article has no imageUrl — skipping");
  }

  const imgH = opts.storyFormat ? 1920 : H;

  const [fontData, rawBg] = await Promise.all([
    loadFont(),
    fetchImageBuffer(article.imageUrl),
  ]);

  // If fetch failed despite having a URL, also skip
  if (!rawBg) {
    throw new Error("NO_IMAGE: could not fetch imageUrl — skipping");
  }

  let bgBase64: string | null = null;
  try {
    const resized = await sharp(rawBg)
      .resize(W, imgH, { fit: "cover", position: "attention" })
      .jpeg({ quality: 88 })
      .toBuffer();
    bgBase64 = `data:image/jpeg;base64,${resized.toString("base64")}`;
  } catch { bgBase64 = null; }

  const headlineSpans = buildHeadlineSpans(article.title);
  const category = article.category.toUpperCase();

  // Aggressive font scaling — estimate rendered line count
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

  // Further reduce if many words (each word needs space)
  if (wordCount > 12 && headlineFontSize > 60) headlineFontSize = Math.min(headlineFontSize, 60);
  if (wordCount > 16 && headlineFontSize > 50) headlineFontSize = Math.min(headlineFontSize, 50);

  const showBreaking = opts.isBreaking === true;
  const logoTop = showBreaking ? 80 : 44;

  const summaryChildren = article.summary
    ? [{ type: "span" as const, props: { style: { color: "rgba(255,255,255,0.72)" }, children: article.summary.slice(0, 90) + (article.summary.length > 90 ? "\u2026" : "") } }]
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svg = await (satori as any)(
    {
      type: "div",
      props: {
        style: {
          display: "flex", flexDirection: "column",
          width: W, height: imgH,
          position: "relative", backgroundColor: BLACK, overflow: "hidden",
          fontFamily: "BebasNeue",
        },
        children: [
          // Background
          bgBase64
            ? { type: "img", props: { src: bgBase64, style: { position: "absolute", top: 0, left: 0, width: W, height: imgH, objectFit: "cover", objectPosition: "center top" } } }
            : buildGradientBg(category),

          // Gradient overlay
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                position: "absolute", left: 0, right: 0, top: 0, height: imgH,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.88) 65%, rgba(0,0,0,1) 78%)",
              },
              children: [],
            },
          },

          // Breaking banner
          ...(showBreaking ? [buildBreakingBanner()] : []),

          // Logo
          buildLogo(logoTop),

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
                // Category badge
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex", alignSelf: "flex-start",
                      backgroundColor: PINK,
                      paddingLeft: 20, paddingRight: 20, paddingTop: 8, paddingBottom: 8,
                      borderRadius: 4, marginBottom: 20,
                    },
                    children: [{
                      type: "span",
                      props: { style: { color: WHITE, fontSize: 34, fontWeight: 700, letterSpacing: 4, lineHeight: 1 }, children: category },
                    }],
                  },
                },
                // Headline
                {
                  type: "div",
                  props: {
                    style: { display: "flex", flexWrap: "wrap", fontSize: headlineFontSize, fontWeight: 400, lineHeight: 0.92, letterSpacing: 1, marginBottom: 22 },
                    children: headlineSpans,
                  },
                },
                // Summary (optional)
                ...(summaryChildren ? [{
                  type: "div",
                  props: {
                    style: { display: "flex", flexWrap: "wrap", fontSize: 26, fontWeight: 400, fontStyle: "italic", lineHeight: 1.35, letterSpacing: 0.3 },
                    children: summaryChildren,
                  },
                }] : []),
              ],
            },
          },
        ],
      },
    },
    { width: W, height: imgH, fonts: [{ name: "BebasNeue", data: fontData, weight: 400, style: "normal" }] }
  );

  return sharp(Buffer.from(svg)).resize(W, imgH).jpeg({ quality: 93 }).toBuffer();
}
