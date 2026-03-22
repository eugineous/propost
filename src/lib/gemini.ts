import { GoogleGenerativeAI } from "@google/generative-ai";
import { Article } from "./types";

export interface AIContent {
  clickbaitTitle: string;
  caption: string;
}

const SYSTEM_PROMPT = `You are the senior content editor for PPP TV Kenya — a viral Kenyan entertainment news brand on Instagram and Facebook.
You write like a trained journalist who understands social media. Every caption must read like a real news story.

CLICKBAIT_TITLE RULES:
- ALL CAPS always. Max 10 words.
- Use ONE proven lever:
  • Curiosity Gap: "THE REAL REASON [X] HAPPENED"
  • Named Conflict: "[NAME] VS [NAME]: WHAT REALLY HAPPENED"
  • Reveal: "[PERSON] FINALLY BREAKS SILENCE ON [TOPIC]"
  • Numbers: "KSH [FIGURE] — HERE'S WHY THAT MATTERS"
  • Suppressed: "NOBODY IS TALKING ABOUT WHAT [X] JUST DID"
- POWER WORDS: FINALLY, EXPOSED, REVEALED, CONFIRMED, SHOCKING, TRUTH, SECRET
- Kenyan slang when natural: SASA, ENYEWE, KUMBE, WUEH
- NEVER fabricate facts. Only use what is in the article.

CAPTION RULES:
The caption is a SHORT NEWS STORY with REAL INFORMATION from the article.

STRUCTURE (follow exactly):
Line 1: [CLICKBAIT_TITLE — ALL CAPS]
Line 2: [blank]
Line 3: [LEDE — one sentence: WHO did WHAT. Use real names.]
Line 4: [blank]
Line 5-7: [BODY — 2-3 sentences of real story details. Real names, locations, Ksh figures, what happened, why it matters.]
Line 8: [blank]
Line 9: [CTA — "Drop your thoughts below 👇" OR "Tag someone who needs to see this"]
Line 10: [Closing question specific to this story]

TONE: Write like a Nairobi journalist texting a friend breaking news.
- Use REAL details — names, places, numbers, quotes
- DO NOT write vague lines like "Here's everything you need to know"
- DO NOT write "BREAKING" anywhere
- DO NOT use all-caps in the body (only the title line)
- NO HASHTAGS — do not include any hashtags anywhere
- Max 2 emojis total in the body
- The reader should learn something real from the caption alone

EXAMPLE OF BAD CAPTION (do NOT do this):
"WAHU KAGWI HONOURED FOR 20-YEAR MUSIC LEGACY

The Kenyan music scene just shifted.
Here's everything you need to know...

Get the full story on PPP TV Kenya — link in bio."

EXAMPLE OF GOOD CAPTION (do this):
"WAHU KAGWI HONOURED FOR 20-YEAR MUSIC LEGACY WITH ONRPM KENYA AWARD

Wahu Kagwi has been recognised with the ONErpm Kenya Legacy Award for two decades of shaping Kenyan music.

The award was presented at a ceremony in Nairobi, celebrating her journey from her 2003 debut to becoming one of East Africa's most influential artists. ONErpm Kenya cited her consistent output and mentorship of younger artists as key reasons for the honour. Wahu dedicated the award to her fans and her family.

Drop your thoughts below 👇
Who else deserves a legacy award in Kenya?"`;

export async function generateAIContent(article: Article): Promise<AIContent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback(article);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0.75, maxOutputTokens: 700 },
    });

    const hasSummary = article.summary && article.summary.trim().length > 20;
    const prompt =
      "ARTICLE TITLE: " + article.title + "\n" +
      "CATEGORY: " + article.category + "\n" +
      "SOURCE: " + (article.sourceName || "unknown") + "\n" +
      (hasSummary ? "ARTICLE CONTENT:\n" + article.summary + "\n" : "") +
      "\nGenerate a CLICKBAIT_TITLE and a CAPTION that reads like a real news story.\n" +
      "The caption MUST include real names, real details, and real context from the article.\n" +
      "DO NOT include any hashtags.\n" +
      "\nFormat EXACTLY as:\nCLICKBAIT_TITLE: ...\nCAPTION: ...";

    const result = await model.generateContent({
      systemInstruction: SYSTEM_PROMPT,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = result.response.text().trim();
    const titleMatch = text.match(/CLICKBAIT_TITLE:\s*(.+)/);
    const captionMatch = text.match(/CAPTION:\s*([\s\S]+)/);

    const clickbaitTitle = titleMatch?.[1]?.trim() ?? buildClickbaitTitle(article);
    let rawCaption = captionMatch?.[1]?.trim() ?? "";

    // Strip any hashtags Gemini sneaks in
    rawCaption = rawCaption.replace(/#\w+/g, "").replace(/\s{2,}/g, "\n\n").trim();

    const caption = isVagueCaption(rawCaption)
      ? buildFallbackCaption(article, clickbaitTitle)
      : rawCaption;

    return { clickbaitTitle, caption };
  } catch (err) {
    console.error("[gemini] failed:", err);
    return fallback(article);
  }
}

function isVagueCaption(caption: string): boolean {
  const vaguePatterns = [
    /here's everything you need to know/i,
    /get the full story/i,
    /link in bio/i,
    /stay tuned/i,
    /watch this space/i,
  ];
  if (caption.length < 150) return true;
  return vaguePatterns.some(p => p.test(caption));
}

function fallback(article: Article): AIContent {
  const clickbaitTitle = buildClickbaitTitle(article);
  return { clickbaitTitle, caption: buildFallbackCaption(article, clickbaitTitle) };
}

function buildClickbaitTitle(article: Article): string {
  const title = article.title.toUpperCase();
  const powerWords = ["EXPOSED","REVEALED","CONFIRMED","SHOCKING","FINALLY","SECRET","TRUTH","KSH","MILLION","BILLION"];
  if (powerWords.some(w => title.includes(w))) return title.slice(0, 80);
  const cat = article.category;
  if (cat === "MUSIC") return title.slice(0, 70) + " — NOBODY SAW THIS COMING";
  if (cat === "CELEBRITY") return "FINALLY EXPOSED: " + title.slice(0, 60);
  if (cat === "AWARDS") return title.slice(0, 70) + " — THE TRUTH REVEALED";
  if (cat === "EVENTS") return title.slice(0, 70) + " — HERE'S WHAT REALLY HAPPENED";
  return title.slice(0, 80);
}

function buildFallbackCaption(article: Article, clickbaitTitle: string): string {
  const hasSummary = article.summary && article.summary.trim().length > 30;
  const summary = hasSummary ? article.summary!.trim() : "";
  const lede = article.title + (article.sourceName ? " — " + article.sourceName + " reports." : ".");
  const body = summary
    ? summary.slice(0, 400)
    : "This story is developing. Follow PPP TV Kenya for the latest updates from Nairobi and across East Africa.";
  return (
    clickbaitTitle + "\n\n" +
    lede + "\n\n" +
    body + "\n\n" +
    "Drop your thoughts below 👇\n" +
    "What do you think about this?"
  );
}
