import satori from "satori";
import sharp from "sharp";
import { writeFileSync, renameSync } from "fs";

const W = 1080, H = 1350;

const CAT_COLORS = {
  POLITICS:      { bg: "#FF007A", text: "#FFFFFF" },
  CELEBRITY:     { bg: "#FF007A", text: "#FFFFFF" },
  MUSIC:         { bg: "#9B30FF", text: "#FFFFFF" },
  "TV & FILM":   { bg: "#3B82F6", text: "#FFFFFF" },
  SPORTS:        { bg: "#00BFFF", text: "#000000" },
  BUSINESS:      { bg: "#FFD700", text: "#000000" },
  GENERAL:       { bg: "#E50914", text: "#FFFFFF" },
};
const getCatColor = (cat) => CAT_COLORS[cat.toUpperCase()] ?? { bg: "#E50914", text: "#FFFFFF" };

function getFontSize(title) {
  const n = title.length;
  if (n <= 20) return 160;
  if (n <= 30) return 140;
  if (n <= 40) return 122;
  if (n <= 55) return 108;
  if (n <= 70) return 94;
  if (n <= 90) return 80;
  if (n <= 110) return 68;
  return 58;
}

async function loadFont() {
  const r = await fetch("https://cdn.jsdelivr.net/npm/@fontsource/bebas-neue@5.0.8/files/bebas-neue-latin-400-normal.woff");
  return r.arrayBuffer();
}

async function fetchImg(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

async function generate(article, outFile) {
  const [fontData, rawBg] = await Promise.all([loadFont(), fetchImg(article.imageUrl)]);

  let bgBase64 = null;
  if (rawBg) {
    const resized = await sharp(rawBg).resize(W, H, { fit: "cover", position: "attention" }).jpeg({ quality: 88 }).toBuffer();
    bgBase64 = `data:image/jpeg;base64,${resized.toString("base64")}`;
  }

  const cat = article.category.toUpperCase();
  const { bg: catBg, text: catText } = getCatColor(cat);
  const title = article.title.toUpperCase();
  const fontSize = getFontSize(title);

  console.log(`  "${title}" → ${fontSize}px`);

  const svg = await satori({
    type: "div",
    props: {
      style: { display: "flex", width: W, height: H, position: "relative", backgroundColor: "#000", overflow: "hidden", fontFamily: "BebasNeue" },
      children: [
        // Background
        bgBase64
          ? { type: "img", props: { src: bgBase64, style: { position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover", objectPosition: "center top" } } }
          : { type: "div", props: { style: { position: "absolute", top: 0, left: 0, width: W, height: H, background: "#222", display: "flex" }, children: [] } },

        // Gradient
        { type: "div", props: { style: { display: "flex", position: "absolute", left: 0, right: 0, top: 0, height: H, background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.88) 65%, rgba(0,0,0,1) 78%)" }, children: [] } },

        // Logo — big, top-left
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", position: "absolute", top: 44, left: 44, background: "rgba(0,0,0,0.65)", paddingLeft: 22, paddingRight: 28, paddingTop: 14, paddingBottom: 14, borderRadius: 10, borderLeft: "8px solid #FF007A" },
            children: [
              { type: "span", props: { style: { color: "#fff", fontSize: 80, fontWeight: 700, letterSpacing: 4, lineHeight: 1 }, children: "PPP" } },
              { type: "span", props: { style: { color: "#FF007A", fontSize: 80, fontWeight: 700, letterSpacing: 4, lineHeight: 1, marginLeft: 10 }, children: "TV" } },
            ],
          },
        },

        // Bottom content
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", alignItems: "flex-start", position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 48px 52px 48px" },
            children: [
              // Category pill
              {
                type: "div",
                props: {
                  style: { display: "flex", alignSelf: "flex-start", backgroundColor: catBg, paddingLeft: 32, paddingRight: 32, paddingTop: 16, paddingBottom: 16, borderRadius: 50, marginBottom: 26 },
                  children: [{ type: "span", props: { style: { color: catText, fontSize: 40, fontWeight: 700, letterSpacing: 4, lineHeight: 1 }, children: cat } }],
                },
              },
              // Headline
              {
                type: "div",
                props: {
                  style: { display: "flex", flexWrap: "wrap", fontSize, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.0, letterSpacing: 2, marginBottom: 34 },
                  children: title,
                },
              },
              // Follow for more
              {
                type: "div",
                props: {
                  style: { display: "flex", alignSelf: "flex-start", backgroundColor: catBg, paddingLeft: 36, paddingRight: 36, paddingTop: 18, paddingBottom: 18, borderRadius: 50 },
                  children: [{ type: "span", props: { style: { color: catText, fontSize: 36, fontWeight: 700, letterSpacing: 5, lineHeight: 1 }, children: "FOLLOW FOR MORE" } }],
                },
              },
            ],
          },
        },
      ],
    },
  }, { width: W, height: H, fonts: [{ name: "BebasNeue", data: fontData, weight: 700, style: "normal" }] });

  const buf = await sharp(Buffer.from(svg)).resize(W, H).jpeg({ quality: 93 }).toBuffer();
  writeFileSync(outFile, buf);
  console.log(`  Saved: ${outFile} (${(buf.length / 1024).toFixed(0)} KB)`);
}

const tests = [
  { title: "SIFUNA FACTION PLANS MOMBASA RALLY AMID ODM TENSIONS", category: "POLITICS", imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1080", out: "preview-politics.jpg" },
  { title: "RUTO SIGNS KSH 4.2B DEAL", category: "BUSINESS", imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080", out: "preview-business.jpg" },
  { title: "AKOTHEE DROPS NEW ALBUM", category: "MUSIC", imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1080", out: "preview-music.jpg" },
];

console.log("Generating thumbnails...\n");
for (const t of tests) {
  console.log(`[${t.category}]`);
  await generate(t, t.out);
}
console.log("\nDone. Open preview-politics.jpg, preview-business.jpg, preview-music.jpg");
