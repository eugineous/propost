import satori from "satori";
import sharp from "sharp";
import axios from "axios";
import { Article } from "./types";

const SIZE = 1080;
const ACCENT = "#F47B20"; // Rap TV orange
const WHITE = "#FFFFFF";
const BLACK = "#000000";

// Words that stay white (connectors, articles, prepositions, verbs)
const WHITE_WORDS = new Set([
  "A", "AN", "THE", "AND", "OR", "BUT", "IN", "ON", "AT", "TO", "FOR",
  "OF", "WITH", "BY", "FROM", "AS", "IS", "ARE", "WAS", "WERE", "BE",
  "BEEN", "BEING", "HAVE", "HAS", "HAD", "DO", "DOES", "DID", "WILL",
  "WOULD", "COULD", "SHOULD", "MAY", "MIGHT", "SHALL", "CAN", "NOW",
  "NOT", "NO", "SO", "IF", "THEN", "THAT", "THIS", "THESE", "THOSE",
  "AFTER", "BEFORE", "DURING", "OVER", "UNDER", "ABOUT", "INTO",
  "THROUGH", "BETWEEN", "AMONG", "AGAINST", "ALONG", "AROUND",
  "REPORTEDLY", "ALLEGEDLY", "SAYS", "SAID", "SAYS", "DIES", "DEAD",
  "PASSES", "AWAY", "JOINS", "ADDS", "SETS", "GETS", "PUTS", "TAKES",
  "MAKES", "GIVES", "GOES", "COMES", "RETURNS", "RELEASES", "DROPS",
  "LAUNCHES", "OPENS", "CLOSES", "WINS", "LOSES", "BEATS", "HITS",
  "TOPS", "LEADS", "HEADS", "SIGNS", "LANDS", "BOARDS", "TALKS",
  "CALLS", "TELLS", "SHOWS", "REVEALS", "CONFIRMS", "DENIES",
  "ADDRESSES", "REACTS", "RESPONDS", "EXPLAINS", "ANNOUNCES",
  "YOU", "HE", "SHE", "IT", "WE", "THEY", "HIS", "HER", "ITS",
  "OUR", "THEIR", "YOUR", "MY", "WHO", "WHAT", "WHERE", "WHEN",
  "HOW", "WHY", "WHICH", "ALLOW", "ALLOWS", "ALLOWED",
  "KEEP", "KEEPS", "KEPT", "PREDICT", "PREDICTS", "PREDICTED",
  "WANT", "WANTS", "WANTED", "NEED", "NEEDS", "NEEDED",
  "ALSO", "JUST", "STILL", "EVEN", "ONLY", "BOTH", "ALL", "EACH",
  "MORE", "MOST", "LESS", "LEAST", "VERY", "TOO", "QUITE",
  "PAUSE", "PAUSES", "PAUSED", "DROP", "DROPS", "DROPPED",
  "NEW", "OLD", "FIRST", "LAST", "NEXT", "SAME", "OTHER",
  "UP", "DOWN", "OUT", "OFF", "BACK", "AWAY", "AGAIN",
]);

// Determine if a word should be orange (it's a "key" word — name, noun, subject)
function isAccentWord(word: string): boolean {
  const clean = word.replace(/[^A-Z0-9']/g, "");
  if (clean.length === 0) return false;
  return !WHITE_WORDS.has(clean);
}

// Build headline word spans with two-tone coloring
function buildHeadlineSpans(title: string) {
  const upper = title.toUpperCase();
  const words = upper.split(/\s+/);

  return words.map((word, i) => ({
    type: "span" as const,
    props: {
      style: {
        color: isAccentWord(word) ? ACCENT : WHITE,
        marginRight: i < words.length - 1 ? "0.18em" : "0",
        display: "inline",
      },
      children: word,
    },
  }));
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
    });
    return Buffer.from(res.data);
  } catch {
    return null;
  }
}

async function loadFont(): Promise<ArrayBuffer> {
  // Use Impact-like font: Oswald ExtraBold from Google Fonts
  const url =
    "https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs1_FvsUZiZQ.woff2";
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
    });
    return res.data;
  } catch {
    // Fallback: Inter Bold
    const fallback = await axios.get(
      "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZJhiI2B.woff2",
      { responseType: "arraybuffer", timeout: 10000 }
    );
    return fallback.data;
  }
}

export async function generateImage(article: Article): Promise<Buffer> {
  const [fontData, rawBg] = await Promise.all([
    loadFont(),
    article.imageUrl ? fetchImageBuffer(article.imageUrl) : Promise.resolve(null),
  ]);

  // Prepare background: resize to 1080x1080 cover, convert to base64
  let bgBase64: string | null = null;
  if (rawBg) {
    try {
      const resized = await sharp(rawBg)
        .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
        .jpeg({ quality: 88 })
        .toBuffer();
      bgBase64 = `data:image/jpeg;base64,${resized.toString("base64")}`;
    } catch {
      bgBase64 = null;
    }
  }

  const headlineSpans = buildHeadlineSpans(article.title);
  const category = article.category.toUpperCase();

  // Estimate headline lines to size the black bottom band
  const wordCount = article.title.split(/\s+/).length;
  const estimatedLines = Math.ceil(wordCount / 4);
  // Bottom band height: category pill + headline lines + subtitle + padding
  const bottomBandHeight = 80 + estimatedLines * 130 + 60 + 60;
  const clampedBand = Math.min(Math.max(bottomBandHeight, 320), 520);

  // satori accepts its own vdom format; cast to avoid ReactNode mismatch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svg = await (satori as any)(
    {
      type: "div",
      props: {
        style: {
          width: SIZE,
          height: SIZE,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: BLACK,
          overflow: "hidden",
          fontFamily: "Oswald",
        },
        children: [
          // ── Layer 1: Background image (top portion) ──
          bgBase64
            ? {
                type: "img",
                props: {
                  src: bgBase64,
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: SIZE,
                    height: SIZE - clampedBand + 80, // image bleeds into gradient zone
                    objectFit: "cover",
                    objectPosition: "center top",
                  },
                },
              }
            : null,

          // ── Layer 2: Gradient fade (image → black) ──
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                left: 0,
                right: 0,
                bottom: clampedBand - 80,
                height: 220,
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,1) 100%)",
              },
            },
          },

          // ── Layer 3: Solid black bottom band ──
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: clampedBand,
                backgroundColor: BLACK,
              },
            },
          },

          // ── Layer 4: PPP TV Logo (top-left) ──
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 36,
                left: 44,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    },
                    children: [
                      // Crown icon (unicode)
                      {
                        type: "span",
                        props: {
                          style: {
                            fontSize: 20,
                            color: WHITE,
                            lineHeight: 1,
                          },
                          children: "♛",
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            color: WHITE,
                            fontSize: 36,
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            lineHeight: 1,
                          },
                          children: "PPP",
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            color: WHITE,
                            fontSize: 28,
                            fontWeight: 400,
                            letterSpacing: "0.04em",
                            lineHeight: 1,
                          },
                          children: "TV",
                        },
                      },
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      color: ACCENT,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      marginTop: 2,
                      marginLeft: 26,
                    },
                    children: "KENYA",
                  },
                },
              ],
            },
          },

          // ── Layer 5: Bottom content (category + headline + subtitle) ──
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: clampedBand,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                padding: "28px 48px 44px 48px",
                gap: 0,
              },
              children: [
                // Category pill (white box, black text — like Rap TV "NEWS" tag)
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignSelf: "flex-start",
                      backgroundColor: WHITE,
                      paddingLeft: 18,
                      paddingRight: 18,
                      paddingTop: 6,
                      paddingBottom: 6,
                      marginBottom: 20,
                    },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: {
                            color: BLACK,
                            fontSize: 22,
                            fontWeight: 800,
                            letterSpacing: "0.12em",
                          },
                          children: category,
                        },
                      },
                    ],
                  },
                },

                // Headline (two-tone, large, condensed)
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexWrap: "wrap",
                      fontSize: 88,
                      fontWeight: 800,
                      lineHeight: 1.0,
                      letterSpacing: "-0.01em",
                      marginBottom: 20,
                    },
                    children: headlineSpans,
                  },
                },

                // Subtitle (article summary, italic white small)
                {
                  type: "div",
                  props: {
                    style: {
                      color: "rgba(255,255,255,0.75)",
                      fontSize: 26,
                      fontWeight: 400,
                      fontStyle: "italic",
                      lineHeight: 1.3,
                    },
                    children: article.summary
                      ? article.summary.slice(0, 80) +
                        (article.summary.length > 80 ? "…" : "")
                      : "",
                  },
                },
              ],
            },
          },
        ].filter(Boolean),
      },
    },
    {
      width: SIZE,
      height: SIZE,
      fonts: [
        {
          name: "Oswald",
          data: fontData,
          weight: 800,
          style: "normal",
        },
      ],
    }
  );

  const jpeg = await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .jpeg({ quality: 92 })
    .toBuffer();

  return jpeg;
}
