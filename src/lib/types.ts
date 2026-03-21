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

export interface SocialPost {
  platform: Platform;
  caption: string;
  imageUrl?: string;
  articleUrl: string;
}

export type Platform = "instagram" | "facebook";

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
