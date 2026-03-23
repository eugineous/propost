import { SocialPost, PublishResult } from "./types";

const GRAPH_API = "https://graph.facebook.com/v19.0";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try { return await fn(); }
    catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status && status >= 400 && status < 500) throw err;
      lastErr = err;
      await sleep(Math.pow(2, attempt) * 1500);
    }
  }
  throw lastErr;
}

async function uploadImageToFB(imageBuffer: Buffer, pageId: string, accessToken: string, published = false): Promise<string> {
  const blob = new Blob(
    [imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength) as ArrayBuffer],
    { type: "image/jpeg" }
  );
  const form = new FormData();
  form.append("source", blob, "image.jpg");
  form.append("published", String(published));
  form.append("access_token", accessToken);
  const res = await fetch(`${GRAPH_API}/${pageId}/photos`, { method: "POST", body: form });
  const data = await res.json() as any;
  if (!res.ok || data.error) throw new Error(data?.error?.message ?? `Upload failed: HTTP ${res.status}`);
  return data.id as string;
}

async function waitForIGContainer(containerId: string, token: string): Promise<void> {
  const maxAttempts = 24;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000);
    try {
      const res = await fetch(`${GRAPH_API}/${containerId}?fields=status_code,status&access_token=${token}`);
      const data = await res.json() as any;
      const status = data.status_code || data.status || "";
      console.log(`[ig] container ${containerId} status: ${status} (attempt ${i + 1})`);
      if (status === "FINISHED") return;
      if (status === "ERROR" || status === "EXPIRED") throw new Error(`IG container failed: ${status}`);
    } catch (err: any) {
      if (err.message.includes("failed:")) throw err;
    }
  }
  console.warn("[ig] container polling timed out — attempting publish anyway");
}

// Upload video buffer to IG via resumable upload API, return the video handle
async function uploadVideoToIG(
  videoBuffer: Buffer,
  accountId: string,
  token: string
): Promise<string> {
  const fileSize = videoBuffer.byteLength;

  // Step 1: Initialize upload session
  const initRes = await fetch(`https://rupload.facebook.com/ig-api-upload/v19.0/${accountId}/videos`, {
    method: "POST",
    headers: {
      "Authorization": `OAuth ${token}`,
      "X-FB-Video-File-Size": String(fileSize),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ upload_type: "resumable" }),
  });
  const initData = await initRes.json() as any;
  if (!initRes.ok || initData.error) throw new Error(initData?.error?.message ?? `IG upload init failed: HTTP ${initRes.status}`);
  const uploadUrl = initData.uri as string;
  if (!uploadUrl) throw new Error("IG upload init did not return a URI");

  // Step 2: Upload the video bytes
  const blob = new Blob(
    [videoBuffer.buffer.slice(videoBuffer.byteOffset, videoBuffer.byteOffset + videoBuffer.byteLength) as ArrayBuffer],
    { type: "video/mp4" }
  );
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `OAuth ${token}`,
      "X-Entity-Type": "video/mp4",
      "X-Entity-Name": "video.mp4",
      "X-Entity-Length": String(fileSize),
      "Offset": "0",
      "Content-Type": "application/octet-stream",
    },
    body: blob,
  });
  const uploadData = await uploadRes.json() as any;
  if (!uploadRes.ok || uploadData.error) throw new Error(uploadData?.error?.message ?? `IG video upload failed: HTTP ${uploadRes.status}`);
  const videoHandle = uploadData.h as string;
  if (!videoHandle) throw new Error("IG video upload did not return a handle");
  return videoHandle;
}

// ── Video posting to Instagram ───────────────────────────────────────────────
// Strategy: upload video buffer directly to IG via resumable upload API → create Reels container with video handle
async function publishVideoToInstagram(
  post: SocialPost,
  videoBuffer: Buffer,
  coverUrl?: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  if (!token || !accountId) return { success: false, error: "Instagram tokens not configured" };

  try {
    // Upload video directly to IG and get a video handle
    const videoHandle = await uploadVideoToIG(videoBuffer, accountId, token);

    // Create IG Reels container using the video handle
    const containerRes = await withRetry(() =>
      fetch(`${GRAPH_API}/${accountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "REELS",
          video_handle: videoHandle,
          caption: post.caption,
          share_to_feed: true,
          ...(coverUrl ? { cover_url: coverUrl } : {}),
          access_token: token,
        }),
      })
    );
    const container = await containerRes.json() as any;
    if (!containerRes.ok || container.error) throw new Error(container?.error?.message ?? "IG video container failed");

    await waitForIGContainer(container.id, token);

    const publishRes = await withRetry(() =>
      fetch(`${GRAPH_API}/${accountId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: container.id, access_token: token }),
      })
    );
    const published = await publishRes.json() as any;
    if (!publishRes.ok || published.error) throw new Error(published?.error?.message ?? "IG video publish failed");
    return { success: true, postId: published.id };
  } catch (err: any) {
    console.error("[ig-video] error:", err?.message);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

// ── Video posting to Facebook ────────────────────────────────────────────────
async function publishVideoToFacebook(
  post: SocialPost,
  videoBuffer: Buffer
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!token || !pageId) return { success: false, error: "Facebook tokens not configured" };

  try {
    const fbCaption = post.articleUrl ? post.caption + "\n\n\uD83D\uDD17 " + post.articleUrl : post.caption;
    const blob = new Blob(
      [videoBuffer.buffer.slice(videoBuffer.byteOffset, videoBuffer.byteOffset + videoBuffer.byteLength) as ArrayBuffer],
      { type: "video/mp4" }
    );
    const form = new FormData();
    form.append("source", blob, "video.mp4");
    form.append("description", fbCaption);
    form.append("published", "true");
    form.append("access_token", token);
    const res = await withRetry(() => fetch(`${GRAPH_API}/${pageId}/videos`, { method: "POST", body: form }));
    const data = await res.json() as any;
    if (!res.ok || data.error) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
    return { success: true, postId: data.id };
  } catch (err: any) {
    console.error("[fb-video] error:", err?.message);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

// ── Image posting to Instagram ───────────────────────────────────────────────
async function publishToInstagram(post: SocialPost, imageBuffer: Buffer): Promise<{ success: boolean; postId?: string; error?: string }> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const fbToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const fbPageId = process.env.FACEBOOK_PAGE_ID;
  if (!token || !accountId || !fbToken || !fbPageId) return { success: false, error: "Instagram/Facebook tokens not configured" };

  try {
    const fbPhotoId = await withRetry(() => uploadImageToFB(imageBuffer, fbPageId, fbToken, false));
    const photoRes = await fetch(`${GRAPH_API}/${fbPhotoId}?fields=images&access_token=${fbToken}`);
    const photoData = await photoRes.json() as any;
    const hostedUrl: string = photoData.images?.[0]?.source ?? "";
    if (!hostedUrl) throw new Error("Could not get hosted image URL from FB");
    await sleep(4000);

    const containerRes = await withRetry(() =>
      fetch(`${GRAPH_API}/${accountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: hostedUrl, caption: post.caption, access_token: token }),
      })
    );
    const container = await containerRes.json() as any;
    if (!containerRes.ok || container.error) throw new Error(container?.error?.message ?? "IG container creation failed");

    await waitForIGContainer(container.id, token);

    const publishRes = await withRetry(() =>
      fetch(`${GRAPH_API}/${accountId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: container.id, access_token: token }),
      })
    );
    const published = await publishRes.json() as any;
    if (!publishRes.ok || published.error) throw new Error(published?.error?.message ?? "IG publish failed");
    return { success: true, postId: published.id };
  } catch (err: any) {
    console.error("[ig] error:", err?.message);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

// ── Image posting to Facebook ────────────────────────────────────────────────
async function publishToFacebook(post: SocialPost, imageBuffer: Buffer): Promise<{ success: boolean; postId?: string; error?: string }> {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!token || !pageId) return { success: false, error: "Facebook tokens not configured" };

  try {
    const blob = new Blob(
      [imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength) as ArrayBuffer],
      { type: "image/jpeg" }
    );
    const form = new FormData();
    form.append("source", blob, "image.jpg");
    const fbCaption = post.articleUrl ? post.caption + "\n\n\uD83D\uDD17 " + post.articleUrl : post.caption;
    form.append("caption", fbCaption);
    form.append("access_token", token);
    const res = await withRetry(() => fetch(`${GRAPH_API}/${pageId}/photos`, { method: "POST", body: form }));
    const data = await res.json() as any;
    if (!res.ok || data.error) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
    return { success: true, postId: data.id };
  } catch (err: any) {
    console.error("[fb] error:", err?.message);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

export async function publish(
  posts: { ig?: SocialPost; fb?: SocialPost },
  imageBuffer: Buffer,
  videoBuffer?: Buffer,
  coverImageUrl?: string
): Promise<PublishResult> {
  if (videoBuffer) {
    // Post as actual video to both platforms (sequential — FB first since IG reuses FB CDN)
    const facebook = posts.fb
      ? await publishVideoToFacebook(posts.fb, videoBuffer)
      : { success: false, error: "skipped" };
    const instagram = posts.ig
      ? await publishVideoToInstagram(posts.ig, videoBuffer, coverImageUrl)
      : { success: false, error: "skipped" };
    return { instagram, facebook };
  }
  // Default: post as image
  const [instagram, facebook] = await Promise.all([
    posts.ig ? publishToInstagram(posts.ig, imageBuffer) : Promise.resolve({ success: false, error: "skipped" }),
    posts.fb ? publishToFacebook(posts.fb, imageBuffer) : Promise.resolve({ success: false, error: "skipped" }),
  ]);
  return { instagram, facebook };
}
