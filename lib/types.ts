export type SocialLinks = Partial<{
  instagram: string;
  tiktok: string;
  youtube: string;
  x: string;
  facebook: string;
}>;

export type NewsItem = {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  tags: string[];
  category: string;
  author: string;
  sourceUrl?: string;
  publishedAt: string;
  featured?: boolean;
  body: string;
};

export type Show = {
  slug: string;
  title: string;
  description: string;
  schedule: string;
  image: string;
  hosts: string[];
  tags: string[];
  clips: string[];
};

export type Host = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  socials: SocialLinks;
  shows: string[];
};

export type Artist = {
  slug: string;
  name: string;
  genre: string;
  bio: string;
  image: string;
  socials: SocialLinks;
  videos: string[];
};

export type Project = {
  slug: string;
  title: string;
  description: string;
  image: string;
  link: string;
  sponsor?: boolean;
};

// Admin/backend types used by the autoposter pipeline
export interface Article {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  summary: string;
  fullBody: string;
  sourceName: string;
  publishedAt: Date;
  category: string;
  tags?: string[];
}

export type Platform = "instagram" | "facebook";

export interface SocialPost {
  platform: Platform;
  caption: string;
  imageUrl?: string;
  articleUrl: string;
}

export interface PlatformResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export interface PublishResult {
  instagram: PlatformResult;
  facebook: PlatformResult;
}

export interface SchedulerResponse {
  posted: number;
  skipped: number;
  errors: Array<{ articleId: string; message: string }>;
}
