import { GoogleGenerativeAI } from "@google/generative-ai";
import { Article } from "./types";

const BASE_HASHTAGS = "#PPPTVKenya #Entertainment #Kenya #Nairobi";

const CAT_TAGS: Record<string, string> = {
  CELEBRITY:     "#Celebrity #KenyanCelebrity",
  MUSIC:         "#KenyanMusic #AfricanMusic",
  "TV & FILM":   "#KenyanTV #KenyanFilm",
  FASHION:       "#KenyanFashion",
  EVENTS:        "#NairobiEvents",
  "EAST AFRICA": "#EastAfrica #Kenya",
  INTERNATIONAL: "#Kenya #Africa",
  AWARDS:        "#KenyanAwards",
  COMEDY:        "#KenyanComedy",
  INFLUENCERS:   "#KenyanInfluencer",
  GENERAL:       "#Kenya #Nairobi",
};

const HASHTAG_SETS = [
  "#PPPTVKenya #KenyaNews #NairobiLife #KenyanEntertainment #AfricaNews",
  "#PPPTVKenya #KenyaTwitter #NairobiVibes #KenyanMedia #EastAfricaNews",
  "#PPPTVKenya #KenyaUpdates #NairobiNow #KenyanCulture #AfricanMedia",
  "#PPPTVKenya #KenyaTrending #NairobiDaily #KenyanStories #AfricaEntertainment",
  "#PPPTVKenya #KenyaToday #NairobiScene #KenyanVoices #AfricaMedia",
];

function getHashtags(category: string): string {
  const setIndex = new Date().getDay() % HASHTAG_SETS.length;
  return BASE_HASHTAGS + " " + (CAT_TAGS[category] ?? "") + " " + HASHTAG_SETS[setIndex];
}

export interface AIContent {
  clickbaitTitle: string;
  caption: string;
}

// ── The system prompt that teaches Gemini to write like a real news editor ──
const SYSTEM_PROMPT = `You are the senior content editor for PPP TV Kenya — a viral Kenyan entertainment news brand on Instagram and Facebook.

You write like a trained journalist who also understands social media. Every caption must read like a real news story, not a vague teaser.

═══ CLICKBAIT_TITLE RULES ═══
- ALL CAPS always. Max 10 words.
- Use ONE of these proven levers:
  • Curiosity Gap: "THE REAL REASON [X] HAPPENED (IT'S NOT WHAT YOU THINK)"
  • Named Conflict: "[NAME] VS [NAME]: HERE'S WHAT REALLY HAPPENED"
  • Reveal Cliff: "[PERSON] FINALLY BREAKS SILENCE ON [TOPIC]"
  • Numbers Bomb: "KSH [FIGURE] — HERE'S WHY THAT MATTERS"
  • Suppressed Story: "NOBODY IS TALKING ABOUT WHAT [X] JUST DID"
- POWER WORDS: FINALLY, EXPOSED, REVEALED, CONFIRMED, SHOCKING, TRUTH, SECRET
- Kenyan slang when natural: SASA, ENYEWE, KUMBE, WUEH
- Lead with Ksh figure if money is involved
- NEVER fabricate facts. Only use what is in the article.

═══ CAPTION RULES — READ CAREFULLY ═══
The caption is a SHORT NEWS STORY. It must contain REAL INFORMATION from the article.

STRUCTURE (follow exactly):
Line 1: [CLICKBAIT_TITLE — ALL CAPS, exact copy from above]
Line 2: [blank]
Line 3: [LEDE — one sentence that answers WHO did WHAT. Use real names. This is the most important sentence.]
Line 4: [blank]
Line 5-7: [BODY — 2-3 sentences of actual story details. Include: real names, locations (Nairobi, Mombasa, etc.), Ksh figures if any, what happened, why it matters. Write like a news reporter, not a hype man.]
Line 8: [blank]
Line 9: [CTA — "Drop your thoughts below 👇" OR "Tag someone who needs to see this"]
Line 10: [Closing question specific to this story — make it conversational]
Line 11: [blank]
Line 12: [Hashtags]

TONE RULES:
- Write like a Nairobi journalist texting a friend breaking news
- Use REAL details from the article — names, places, numbers, quotes
- DO NOT write vague lines like "Here's everything you need to know" or "Get the full story"
- DO NOT write "BREAKING" anywhere
- DO NOT use all-caps in the body (only the title line)
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
Who else deserves a legacy award in Kenya?"
`;

export async function generateAIContent(article: Article): Promise<AIContent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback(article);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0.75, maxOutputTokens: 800 },
    });

    const tags = getHashtags(article.category);
    const hasSummary = article.summary && article.summary.trim().length > 20;

    const prompt =
      "ARTICLE TITLE: " + article.title + "\n" +
      "CATEGORY: " + article.category + "\n" +
      "SOURCE: " + (article.sourceName || "unknown") + "\n" +
      (hasSummary ? "ARTICLE CONTENT:\n" + article.summary + "\n" : "") +
      "\nGenerate a CLICKBAIT_TITLE and a CAPTION that reads like a real news story.\n" +
      "The caption MUST include real names, real details, and real context from the article content above.\n" +
      "Hashtags to use at the end: " + tags + "\n" +
      "\nFormat EXACTLY as:\nCLICKBAIT_TITLE: ...\nCAPTION: ...";

    const result = await model.generateContent({
      systemInstruction: SYSTEM_PROMPT,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = result.response.text().trim();
    const titleMatch = text.match(/CLICKBAIT_TITLE:\s*(.+)/);
    const captionMatch = text.match(/CAPTION:\s*([\s\S]+)/);

    const clickbaitTitle = titleMatch?.[1]?.trim() ?? buildClickbaitTitle(article);
    const rawCaption = captionMatch?.[1]?.trim() ?? "";

    // Validate caption has real content (not just vague filler)
    const caption = isVagueCaption(rawCaption)
      ? buildFallbackCaption(article, clickbaitTitle)
      : rawCaption;

    return { clickbaitTitle, caption };
  } catch (err) {
    console.error("[gemini] failed:", err);
    return fallback(article);
  }
}

// Detect if Gemini returned a vague non-story caption
function isVagueCaption(caption: string): boolean {
  const vaguePatterns = [
    /here's everything you need to know/i,
    /get the full story/i,
    /link in bio/i,
    /stay tuned/i,
    /watch this space/i,
  ];
  // If caption is under 200 chars it's probably too thin
  if (caption.length < 200) return true;
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
  const tags = getHashtags(article.category);
  const hasSummary = article.summary && article.summary.trim().length > 30;
  const summary = hasSummary ? article.summary!.trim() : "";

  // Build a real lede from the title
  const lede = article.title + (article.sourceName ? " — " + article.sourceName + " reports." : ".");

  const body = summary
    ? summary.slice(0, 400)
    : "This story is developing. Follow PPP TV Kenya for the latest updates from Nairobi and across East Africa.";

  return (
    clickbaitTitle + "\n\n" +
    lede + "\n\n" +
    body + "\n\n" +
    "Drop your thoughts below 👇\n" +
    "What do you think about this?\n\n" +
    tags
  );
}
