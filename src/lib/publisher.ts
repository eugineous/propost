import { SocialPost, PublishResult } from "./types";

const GRAPH_API = "https://graph.facebook.com/v19.0";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status && status >= 400 && status < 500) throw err;
      lastErr = err;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
  throw lastErr;
}

async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${GRAPH_API}/${path}`);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json() as any;
  if (!res.ok || data.error) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function graphGet(path: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${GRAPH_API}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json() as any;
  if (!res.ok || data.error) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Upload image buffer as multipart form to FB photos endpoint
async function uploadImageBuffer(
  imageBuffer: Buffer,
  pageId: string,
  accessToken: string,
  published = false
): Promise<string> {
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("source", imageBuffer, { filename: "image.jpg", contentType: "image/jpeg" });
  form.append("published", String(published));
  form.append("access_token", accessToken);

  const res = await fetch(`${GRAPH_API}/${pageId}/photos`, {
    method: "POST",
    body: form as any,
    headers: form.getHeaders(),
  });
  const data = await res.json() as any;
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message ?? `Upload failed: HTTP ${res.status}`);
  }
  return data.id as string;
}

async function publishToInstagram(
  post: SocialPost,
  imageBuffer: Buffer
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const fbToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const fbPageId = process.env.FACEBOOK_PAGE_ID;

  if (!token || !accountId || !fbToken || !fbPageId) {
    return { success: false, error: "Instagram/Facebook tokens not configured" };
  }

  try {
    // Upload to FB as unpublished to get a hosted URL for IG
    const fbPhotoId = await withRetry(() =>
      uploadImageBuffer(imageBuffer, fbPageId, fbToken, false)
    );

    const photoData = await graphGet(fbPhotoId, {
      fields: "images",
      access_token: fbToken,
    });
    const hostedUrl: string = photoData.images?.[0]?.source ?? "";
    if (!hostedUrl) throw new Error("Could not get hosted image URL from FB");

    // Create IG media container
    const container = await withRetry(() =>
      graphPost(`${accountId}/media`, {
        image_url: hostedUrl,
        caption: post.caption,
        access_token: token,
      })
    );

    // Publish container
    const published = await withRetry(() =>
      graphPost(`${accountId}/media_publish`, {
        creation_id: container.id,
        access_token: token,
      })
    );

    return { success: true, postId: published.id };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

async function publishToFacebook(
  post: SocialPost,
  imageBuffer: Buffer
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!token || !pageId) {
    return { success: false, error: "Facebook tokens not configured" };
  }

  try {
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("source", imageBuffer, { filename: "image.jpg", contentType: "image/jpeg" });
    form.append("caption", post.caption);
    form.append("access_token", token);

    const res = await withRetry(() =>
      fetch(`${GRAPH_API}/${pageId}/photos`, {
        method: "POST",
        body: form as any,
        headers: form.getHeaders(),
      })
    );
    const data = await (res as any).json() as any;
    if (!(res as any).ok || data.error) {
      throw new Error(data?.error?.message ?? `HTTP ${(res as any).status}`);
    }

    return { success: true, postId: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
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
