"use client";
import { useState, useEffect, useRef } from "react";

const PINK = "#FF007A";
const PINK_DIM = "rgba(255,0,122,0.15)";
const PINK_GLOW = "rgba(255,0,122,0.08)";
const BLACK = "#000000";
const SURFACE = "#141414";
const SURFACE2 = "#1a1a1a";
const BORDER = "#2a2a2a";
const MUTED = "#777777";
const WHITE = "#ffffff";
const GREEN = "#22c55e";
const RED = "#f87171";

interface PostLogEntry {
  articleId: string;
  title: string;
  url: string;
  category: string;
  sourceType?: string;
  manualPost?: boolean;
  instagram: { success: boolean; postId?: string; error?: string };
  facebook: { success: boolean; postId?: string; error?: string };
  postedAt: string;
  isBreaking?: boolean;
}

interface RetryState {
  articleId: string;
  platform: "instagram" | "facebook" | "both";
  loading: boolean;
  result?: { success: boolean; error?: string };
}

interface UrlPreview {
  scraped: { type: string; title: string; description: string; imageUrl: string; sourceName: string };
  ai: { clickbaitTitle: string; caption: string };
  category: string;
  imageBase64: string;
}

const CATEGORIES = ["AUTO", "CELEBRITY", "MUSIC", "TV & FILM", "FASHION", "EVENTS", "AWARDS", "EAST AFRICA", "GENERAL"];

const TYPE_ICONS: Record<string, string> = {
  youtube: "▶ YouTube",
  tiktok: "♪ TikTok",
  twitter: "𝕏 Twitter",
  instagram: "◎ Instagram",
  article: "📰 Article",
  unknown: "🔗 Link",
};

export default function Home() {
  const [postLog, setPostLog] = useState<PostLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  // URL poster state
  const [urlInput, setUrlInput] = useState("");
  const [urlCategory, setUrlCategory] = useState("AUTO");
  const [urlPreview, setUrlPreview] = useState<UrlPreview | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlPosting, setUrlPosting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlSuccess, setUrlSuccess] = useState<string | null>(null);
  const [retryStates, setRetryStates] = useState<Record<string, RetryState>>({});
  const [lightbox, setLightbox] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLog();
    const interval = setInterval(fetchLog, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchLog() {
    try {
      const r = await fetch("/api/post-log");
      if (r.ok) { const d = await r.json(); setPostLog(d.log || []); }
    } catch { /* non-fatal */ }
    finally { setLogLoading(false); }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  }

  async function handlePreview() {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setUrlError(null);
    setUrlPreview(null);
    setUrlSuccess(null);
    try {
      const res = await fetch("/api/preview-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim(), category: urlCategory === "AUTO" ? undefined : urlCategory }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Preview failed");
      setUrlPreview(data);
    } catch (e: any) {
      setUrlError(e.message);
    } finally {
      setUrlLoading(false);
    }
  }

  async function handlePost() {
    if (!urlPreview || !urlInput.trim()) return;
    setUrlPosting(true);
    setUrlError(null);
    setUrlSuccess(null);
    try {
      const res = await fetch("/api/post-from-url-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlInput.trim(),
          category: urlCategory === "AUTO" ? undefined : urlCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Post failed");
      const ig = data.instagram?.success;
      const fb = data.facebook?.success;
      setUrlSuccess(
        (ig && fb) ? "Posted to Instagram + Facebook" :
        ig ? "Posted to Instagram only" :
        fb ? "Posted to Facebook only" :
        "Post failed on both platforms"
      );
      if (ig || fb) {
        setUrlInput("");
        setUrlPreview(null);
        setTimeout(fetchLog, 2000);
      }
    } catch (e: any) {
      setUrlError(e.message);
    } finally {
      setUrlPosting(false);
    }
  }


  async function handleRetry(entry: PostLogEntry, platform: "instagram" | "facebook") {
    const key = entry.articleId + "_" + platform;
    setRetryStates(s => ({ ...s, [key]: { articleId: entry.articleId, platform, loading: true } }));
    try {
      const res = await fetch("/api/retry-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: entry.articleId,
          title: entry.title,
          caption: entry.title, // will be regenerated
          articleUrl: entry.url,
          category: entry.category,
          platform,
        }),
      });
      const data = await res.json();
      const success = platform === "instagram" ? data.instagram?.success : data.facebook?.success;
      setRetryStates(s => ({ ...s, [key]: { articleId: entry.articleId, platform, loading: false, result: { success, error: success ? undefined : (data.instagram?.error || data.facebook?.error || data.error) } } }));
      if (success) setTimeout(fetchLog, 1500);
    } catch (e: any) {
      setRetryStates(s => ({ ...s, [key]: { articleId: entry.articleId, platform, loading: false, result: { success: false, error: e.message } } }));
    }
  }

  const todayPosts = postLog.filter(p => new Date(p.postedAt).toDateString() === new Date().toDateString()).length;

  return (
    <div style={{ minHeight: "100vh", background: BLACK, color: WHITE, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", background: "linear-gradient(to bottom, rgba(0,0,0,0.95), transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: WHITE, letterSpacing: 2 }}>PPP<span style={{ color: PINK }}>TV</span></span>
          <span style={{ fontSize: 11, color: PINK, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>Auto Poster</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: MUTED }}>{todayPosts}/6 posts today</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, boxShadow: "0 0 6px " + GREEN }} />
            <span style={{ fontSize: 12, color: MUTED }}>Live</span>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ position: "relative", height: 320, overflow: "hidden", background: "linear-gradient(135deg, #0a0a0a 0%, #1a001a 50%, #0a0a0a 100%)", display: "flex", alignItems: "flex-end" }}>
        <div style={{ position: "absolute", top: "20%", left: "30%", width: 600, height: 400, background: "radial-gradient(ellipse, " + PINK_GLOW + " 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 2, padding: "0 64px 48px 64px" }}>
          <div style={{ fontSize: 11, color: PINK, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", marginBottom: 12 }}>PPP TV Kenya · Auto Poster</div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 64, lineHeight: 0.9, letterSpacing: 2, color: WHITE, marginBottom: 12 }}>
            POST FROM <span style={{ color: PINK }}>ANY URL</span>
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
            Paste any article, YouTube, TikTok, or tweet URL. AI builds the thumbnail + caption. Posts instantly.
          </p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(to bottom, transparent, #000)" }} />
      </div>

      <div style={{ padding: "0 48px 80px 48px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ── POST FROM URL ── */}
        <div style={{ marginTop: 40, marginBottom: 48 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: WHITE }}>
            Post from URL
            <span style={{ fontSize: 12, color: MUTED, fontWeight: 400, marginLeft: 12 }}>article · YouTube · TikTok · Twitter/X</span>
          </div>

          {/* URL input row */}
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <input
              ref={inputRef}
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setUrlPreview(null); setUrlError(null); setUrlSuccess(null); }}
              onKeyDown={e => e.key === "Enter" && handlePreview()}
              placeholder="Paste URL here — article, YouTube, TikTok, tweet..."
              style={{
                flex: 1, background: SURFACE, border: "1px solid " + BORDER,
                borderRadius: 8, padding: "14px 18px", color: WHITE, fontSize: 14,
                outline: "none", fontFamily: "inherit",
              }}
            />
            <select
              value={urlCategory}
              onChange={e => setUrlCategory(e.target.value)}
              style={{ background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "14px 16px", color: WHITE, fontSize: 13, cursor: "pointer", outline: "none" }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={handlePreview}
              disabled={urlLoading || !urlInput.trim()}
              style={{
                background: urlLoading ? "rgba(255,255,255,0.1)" : PINK,
                color: WHITE, border: "none", borderRadius: 8,
                padding: "14px 28px", fontWeight: 800, fontSize: 14,
                cursor: urlLoading || !urlInput.trim() ? "not-allowed" : "pointer",
                letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap",
                opacity: urlLoading || !urlInput.trim() ? 0.5 : 1,
                boxShadow: urlLoading ? "none" : "0 0 24px rgba(255,0,122,0.3)",
              }}
            >
              {urlLoading ? "Scraping…" : "Preview"}
            </button>
          </div>

          {/* Error */}
          {urlError && (
            <div style={{ background: "#1a0808", border: "1px solid #5a1a1a", borderRadius: 8, padding: "12px 18px", color: RED, fontSize: 13, marginBottom: 16 }}>
              {urlError}
            </div>
          )}

          {/* Success */}
          {urlSuccess && (
            <div style={{ background: "#081a08", border: "1px solid #1a5a1a", borderRadius: 8, padding: "12px 18px", color: GREEN, fontSize: 13, marginBottom: 16 }}>
              ✓ {urlSuccess}
            </div>
          )}

          {/* Preview card */}
          {urlPreview && (
            <div style={{ background: SURFACE, border: "1px solid " + BORDER, borderRadius: 12, overflow: "hidden", display: "grid", gridTemplateColumns: "300px 1fr", marginTop: 16 }}>
              {/* Thumbnail */}
              <div
                onClick={() => setLightbox(true)}
                style={{ aspectRatio: "4/5", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-in", position: "relative", overflow: "hidden" }}
              >
                <img
                  src={"data:image/jpeg;base64," + urlPreview.imageBase64}
                  alt="Preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.8)", color: WHITE, fontSize: 10, padding: "3px 8px", borderRadius: 4 }}>
                  Click to enlarge
                </div>
              </div>

              {/* Details */}
              <div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Source type badge */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ background: PINK_DIM, color: PINK, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, letterSpacing: 1 }}>
                    {TYPE_ICONS[urlPreview.scraped.type] || urlPreview.scraped.type.toUpperCase()}
                  </span>
                  <span style={{ background: SURFACE2, color: MUTED, fontSize: 11, padding: "4px 12px", borderRadius: 20 }}>
                    {urlPreview.category}
                  </span>
                  <span style={{ color: MUTED, fontSize: 11 }}>{urlPreview.scraped.sourceName}</span>
                </div>

                {/* AI Title */}
                <div>
                  <div style={{ fontSize: 10, color: MUTED, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Image Headline</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: WHITE, lineHeight: 1.1 }}>{urlPreview.ai.clickbaitTitle}</div>
                </div>

                {/* Caption preview */}
                <div>
                  <div style={{ fontSize: 10, color: MUTED, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Caption Preview</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, maxHeight: 120, overflow: "hidden", position: "relative" }}>
                    {urlPreview.ai.caption.slice(0, 300)}
                    {urlPreview.ai.caption.length > 300 && "…"}
                  </div>
                </div>

                {/* Original title */}
                <div style={{ fontSize: 11, color: MUTED, borderTop: "1px solid " + BORDER, paddingTop: 12 }}>
                  Original: {urlPreview.scraped.title.slice(0, 100)}
                </div>

                {/* Post button */}
                <button
                  onClick={handlePost}
                  disabled={urlPosting}
                  style={{
                    background: urlPosting ? "rgba(255,255,255,0.1)" : PINK,
                    color: WHITE, border: "none", borderRadius: 8,
                    padding: "14px 28px", fontWeight: 800, fontSize: 14,
                    cursor: urlPosting ? "not-allowed" : "pointer",
                    letterSpacing: 1, textTransform: "uppercase",
                    opacity: urlPosting ? 0.6 : 1,
                    boxShadow: urlPosting ? "none" : "0 0 24px rgba(255,0,122,0.4)",
                    alignSelf: "flex-start",
                  }}
                >
                  {urlPosting ? "Posting…" : "▶ Post to Instagram + Facebook"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display: "flex", gap: 32, padding: "24px 0", borderBottom: "1px solid " + BORDER, borderTop: "1px solid " + BORDER, marginBottom: 40 }}>
          {[
            { label: "Source", value: "ppptv-v2.vercel.app" },
            { label: "Format", value: "1080 × 1350  4:5" },
            { label: "Cron", value: "Every 30 min (peak hours)" },
            { label: "Daily Cap", value: todayPosts + " / 6 posts" },
            { label: "AI", value: "Gemini 1.5 Flash" },
            { label: "Dedup", value: "Cloudflare KV" },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 10, color: MUTED, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── POST LOG ── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: WHITE, display: "flex", alignItems: "center", gap: 12 }}>
            Recent Posts
            <span style={{ fontSize: 12, color: MUTED, fontWeight: 400 }}>auto-refreshes every minute</span>
          </div>
          {logLoading ? (
            <div style={{ color: MUTED, fontSize: 13 }}>Loading…</div>
          ) : postLog.length === 0 ? (
            <div style={{ background: SURFACE, border: "1px solid " + BORDER, borderRadius: 8, padding: "24px", color: MUTED, fontSize: 13 }}>
              No posts yet. Cron runs every 30 minutes during peak hours.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {postLog.slice(0, 15).map((entry, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto",
                  alignItems: "center", gap: 16, padding: "12px 20px",
                  background: i % 2 === 0 ? SURFACE : "transparent", borderRadius: 6,
                }}>
                  {/* Type badge */}
                  <div style={{ fontSize: 10, color: PINK, fontWeight: 700, background: PINK_DIM, padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>
                    {entry.manualPost ? "MANUAL" : "AUTO"}
                    {entry.isBreaking ? " ⚡" : ""}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: WHITE, fontWeight: 600, marginBottom: 2 }}>{entry.title}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>
                      {entry.category}
                      {entry.sourceType && entry.sourceType !== "article" ? " · " + entry.sourceType : ""}
                      {" · "}
                      <a href={entry.url} target="_blank" rel="noreferrer" style={{ color: PINK, textDecoration: "none" }}>source</a>
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>IG</div>
                    {entry.instagram.success ? (
                      <div style={{ fontSize: 12, color: GREEN }}>✓</div>
                    ) : (
                      <button
                        onClick={() => handleRetry(entry, "instagram")}
                        disabled={retryStates[entry.articleId + "_instagram"]?.loading}
                        style={{ fontSize: 10, color: WHITE, background: PINK, border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", opacity: retryStates[entry.articleId + "_instagram"]?.loading ? 0.5 : 1 }}
                      >
                        {retryStates[entry.articleId + "_instagram"]?.loading ? "…" : retryStates[entry.articleId + "_instagram"]?.result?.success ? "✓" : "↺"}
                      </button>
                    )}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>FB</div>
                    {entry.facebook.success ? (
                      <div style={{ fontSize: 12, color: GREEN }}>✓</div>
                    ) : (
                      <button
                        onClick={() => handleRetry(entry, "facebook")}
                        disabled={retryStates[entry.articleId + "_facebook"]?.loading}
                        style={{ fontSize: 10, color: WHITE, background: PINK, border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer", opacity: retryStates[entry.articleId + "_facebook"]?.loading ? 0.5 : 1 }}
                      >
                        {retryStates[entry.articleId + "_facebook"]?.loading ? "…" : retryStates[entry.articleId + "_facebook"]?.result?.success ? "✓" : "↺"}
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, whiteSpace: "nowrap" }}>{timeAgo(entry.postedAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && urlPreview && (
        <div onClick={() => setLightbox(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.96)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, cursor: "zoom-out" }}>
          <img src={"data:image/jpeg;base64," + urlPreview.imageBase64} alt="Full size" style={{ maxWidth: "88vw", maxHeight: "92vh", borderRadius: 8 }} />
          <div style={{ position: "absolute", top: 20, right: 28, color: MUTED, fontSize: 12 }}>Click to close</div>
        </div>
      )}
    </div>
  );
}
