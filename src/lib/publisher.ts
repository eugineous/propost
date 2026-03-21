import axios, { AxiosError } from "axios";
import { SocialPost, PublishResult } from "./types";

const IG_API = "https://graph.facebook.com/v19.0";
const FB_API = "https://graph.facebook.com/v19.0";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      // Don't retry on 4xx (permanent errors)
      if (status && status >= 400 && status < 500) throw err;
      lastErr = err;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
  throw lastErr;
}

// Upload image buffer to a temporary URL via Facebook's hosted image endpoint
// For Instagram we need a publicly accessible URL — we upload to FB first
async function uploadImageToFacebook(
  imageBuffer: Buffer,
  pageId: string,
  accessToken: string
): Promise<string> {
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("source", imageBuffer, {
    filename: "image.jpg",
    contentType: "image/jpeg",
  });
  form.append("published", "false");
  form.append("access_token", accessToken);

  const res = await axios.post(`${FB_API}/${pageId}/photos`, form, {
    headers: form.getHeaders(),
    timeout: 30000,
  });
  return res.data.id as string;
}

async function publishToInstagram(
  post: SocialPost,
  imageBuffer: Buffer
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN!;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID!;

  try {
    // Instagram requires a publicly hosted image URL
    // We upload to imgbb or use a data URL workaround via FB CDN
    // For now: upload to FB as unpublished photo to get a hosted URL
    const fbToken = process.env.FACEBOOK_ACCESS_TOKEN!;
    const fbPageId = process.env.FACEBOOK_PAGE_ID!;
    const fbPhotoId = await withRetry(() =>
      uploadImageToFacebook(imageBuffer, fbPageId, fbToken)
    );

    // Get the hosted URL from FB
    const photoRes = await axios.get(`${FB_API}/${fbPhotoId}`, {
      params: { fields: "images", access_token: fbToken },
    });
    const hostedUrl: string =
      photoRes.data.images?.[0]?.source ?? "";

    if (!hostedUrl) throw new Error("Could not get hosted image URL from FB");

    // Step 1: Create IG media container
    const containerRes = await withRetry(() =>
      axios.post(`${IG_API}/${accountId}/media`, {
        image_url: hostedUrl,
        caption: post.caption,
        access_token: token,
      })
    );
    const containerId: string = containerRes.data.id;

    // Step 2: Publish container
    const publishRes = await withRetry(() =>
      axios.post(`${IG_API}/${accountId}/media_publish`, {
        creation_id: containerId,
        access_token: token,
      })
    );

    return { success: true, postId: publishRes.data.id };
  } catch (err: any) {
    const msg =
      err?.response?.data?.error?.message ?? err?.message ?? "Unknown error";
    return { success: false, error: msg };
  }
}

async function publishToFacebook(
  post: SocialPost,
  imageBuffer: Buffer
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const token = process.env.FACEBOOK_ACCESS_TOKEN!;
  const pageId = process.env.FACEBOOK_PAGE_ID!;

  try {
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("source", imageBuffer, {
      filename: "image.jpg",
      contentType: "image/jpeg",
    });
    form.append("caption", post.caption);
    form.append("access_token", token);

    const res = await withRetry(() =>
      axios.post(`${FB_API}/${pageId}/photos`, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      })
    );

    return { success: true, postId: res.data.id };
  } catch (err: any) {
    const msg =
      err?.response?.data?.error?.message ?? err?.message ?? "Unknown error";
    return { success: false, error: msg };
  }
}

export async function publish(
  posts: { ig: SocialPost; fb: SocialPost },
  imageBuffer: Buffer
): Promise<PublishResult> {
  const [instagram, facebook] = await Promise.all([
    publishToInstagram(posts.ig, imageBuffer),
    publishToFacebook(posts.fb, imageBuffer),
  ]);
  return { instagram, facebook };
}
