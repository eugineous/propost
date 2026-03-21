import { Article, Platform, SocialPost } from "./types";

const PLATFORM_LIMITS: Record<Platform, number> = {
  instagram: 2200,
  facebook: 63206,
};

const CATEGORY_HASHTAGS: Record<string, string[]> = {
  CELEBRITY: ["#Celebrity", "#Entertainment"],
  MUSIC: ["#Music", "#NewMusic"],
  "TV & FILM": ["#TVAndFilm", "#Movies", "#TV"],
  FASHION: ["#Fashion", "#Style"],
  EVENTS: ["#Events", "#LiveEvents"],
  "EAST AFRICA": ["#EastAfrica", "#Kenya", "#Nairobi"],
  INTERNATIONAL: ["#International", "#WorldNews"],
  AWARDS: ["#Awards", "#Entertainment"],
  COMEDY: ["#Comedy", "#Funny"],
  INFLUENCERS: ["#Influencers", "#SocialMedia"],
  GENERAL: [],
};

const BASE_HASHTAGS = ["#PPPTVKenya", "#Entertainment", "#PPPTVNews"];

export function formatPost(article: Article, platform: Platform): SocialPost {
  const limit = PLATFORM_LIMITS[platform];
  const categoryTags = CATEGORY_HASHTAGS[article.category] ?? [];
  const hashtags = [...BASE_HASHTAGS, ...categoryTags].join(" ");
  const attribution = `\n\n📰 Source: ${article.sourceName}`;
  const link = `\n🔗 ${article.url}`;
  const suffix = `${attribution}${link}\n\n${hashtags}`;

  const bodyBudget = limit - suffix.length - 10;
  const body =
    article.fullBody.length > bodyBudget
      ? article.fullBody.slice(0, bodyBudget).trimEnd() + "…"
      : article.fullBody;

  const caption = `${body}${suffix}`;

  return {
    platform,
    caption,
    articleUrl: article.url,
  };
}
