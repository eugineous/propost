"use client";
import { useState } from "react";

interface DryRunArticle {
  id: string;
  title: string;
  category: string;
  imageGenerated: boolean;
  captionLength: { instagram: number; facebook: number };
  error?: string;
}

interface DryRunResult {
  totalArticlesFound: number;
  newArticles: number;
  dryRunSample: DryRunArticle[];
  note: string;
}

const ACCENT = "#E8401C";
const GOLD = "#F5A623";
const BG = "#080808";
const SURFACE = "#111111";
const BORDER = "#1e1e1e";
const MUTED = "#555555";

export default function Home() {
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<DryRunArticle | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchArticles() {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelected(null);
    setImgSrc(null);
    try {
      const res = await fetch("/api/dry-run");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      const first = data.dryRunSample?.find((a: DryRunArticle) => a.imageGenerated);
      if (first) selectArticle(first);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function selectArticle(article: DryRunArticle) {
    setSelected(article);
    setImgSrc(null);
    setImgLoading(true);
    const url = `/api/preview-image?title=${encodeURIComponent(article.title)}&category=${encodeURIComponent(article.category)}&t=${Date.now()}`;
    setImgSrc(url);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff" }}>

      {/* Top nav bar */}
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, color: GOLD }}></span>
          <span className="bebas" style={{ fontSize: 26, color: "#fff", letterSpacing: 3 }}>PPP</span>
          <span className="bebas" style={{ fontSize: 26, color: GOLD, letterSpacing: 3 }}>TV</span>
          <span style={{ fontSize: 11, color: MUTED, letterSpacing: 3, marginLeft: 2, fontWeight: 600 }}>KENYA</span>
          <span style={{ width: 1, height: 20, background: BORDER, margin: "0 12px" }} />
          <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>Auto Poster</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
          <span style={{ fontSize: 12, color: MUTED }}>Live</span>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 12 }}>
            <h1 className="bebas" style={{ fontSize: 72, lineHeight: 0.9, letterSpacing: 2 }}>
              <span style={{ color: ACCENT }}>PPP TV</span>{" "}
              <span style={{ color: "#fff" }}>AUTO</span>{" "}
              <span style={{ color: GOLD }}>POSTER</span>
            </h1>
          </div>
          <p style={{ color: MUTED, fontSize: 14, maxWidth: 520, lineHeight: 1.6 }}>
            Scrapes the latest news from PPP TV Kenya, generates branded 4:5 social images in Bebas Neue, and auto-posts to Instagram &amp; Facebook every 10 minutes.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 40 }}>
          {[
            { label: "News Source", value: "ppptv-v2.vercel.app", accent: false, ok: true },
            { label: "Image Format", value: "1080 × 1350  4:5", accent: false, ok: true },
            { label: "Social APIs", value: "Awaiting tokens", accent: true, ok: false },
          ].map((c) => (
            <div key={c.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "18px 22px" }}>
              <div style={{ fontSize: 10, color: MUTED, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c.ok ? "#22c55e" : ACCENT }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Action button */}
        <div style={{ marginBottom: 36 }}>
          <button
            onClick={fetchArticles}
            disabled={loading}
            style={{
              background: loading ? SURFACE : ACCENT,
              color: "#fff",
              border: loading ? `1px solid ${BORDER}` : "none",
              borderRadius: 8,
              padding: "14px 32px",
              fontWeight: 800,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: 1,
              textTransform: "uppercase",
              transition: "opacity 0.15s",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Fetching" : " Fetch Latest Article"}
          </button>
          {result && (
            <span style={{ marginLeft: 16, fontSize: 13, color: MUTED }}>
              {result.totalArticlesFound} articles in feed  {result.dryRunSample.length} previewed
            </span>
          )}
        </div>

        {error && (
          <div style={{ background: "#1a0808", border: `1px solid #5a1a1a`, borderRadius: 8, padding: "12px 18px", color: "#f87171", fontSize: 13, marginBottom: 24 }}>
             {error}
          </div>
        )}

        {/* Preview grid */}
        {result && (
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, marginBottom: 48 }}>

            {/* Article list */}
            <div>
              <div style={{ fontSize: 10, color: MUTED, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>Articles</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.dryRunSample.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => a.imageGenerated && selectArticle(a)}
                    style={{
                      background: selected?.id === a.id ? "#1a1a1a" : SURFACE,
                      border: `1px solid ${selected?.id === a.id ? ACCENT : BORDER}`,
                      borderRadius: 8,
                      padding: "14px 16px",
                      textAlign: "left",
                      cursor: a.imageGenerated ? "pointer" : "default",
                      opacity: a.imageGenerated ? 1 : 0.45,
                      transition: "border-color 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 10, color: ACCENT, fontWeight: 800, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>{a.category}</div>
                    <div style={{ fontSize: 12, color: "#ccc", lineHeight: 1.5 }}>{a.title.slice(0, 85)}{a.title.length > 85 ? "" : ""}</div>
                    {a.error && <div style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}> {a.error.slice(0, 55)}</div>}
                    {a.imageGenerated && <div style={{ fontSize: 11, color: "#22c55e", marginTop: 6, fontWeight: 600 }}> Image ready</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Image preview */}
            <div>
              <div style={{ fontSize: 10, color: MUTED, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>
                Generated Image {selected ? ` ${selected.category}` : ""}
              </div>
              <div
                onClick={() => imgSrc && !imgLoading && setLightbox(true)}
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  aspectRatio: "4 / 5",
                  maxWidth: 420,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  cursor: imgSrc && !imgLoading ? "zoom-in" : "default",
                }}
              >
                {imgLoading && !imgSrc && (
                  <div style={{ color: MUTED, fontSize: 13 }}>Generating</div>
                )}
                {!imgSrc && !imgLoading && (
                  <div style={{ color: "#2a2a2a", fontSize: 13 }}>Select an article</div>
                )}
                {imgSrc && (
                  <>
                    {imgLoading && (
                      <div style={{ position: "absolute", color: MUTED, fontSize: 13, zIndex: 2 }}>Generating</div>
                    )}
                    <img
                      src={imgSrc}
                      alt="Generated post"
                      onLoad={() => setImgLoading(false)}
                      onError={() => { setImgLoading(false); setImgSrc(null); }}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: imgLoading ? "none" : "block" }}
                    />
                    {!imgLoading && (
                      <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 11, padding: "4px 10px", borderRadius: 4, letterSpacing: 0.5 }}>
                        Click to enlarge
                      </div>
                    )}
                  </>
                )}
              </div>

              {selected?.imageGenerated && !imgLoading && (
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 14px", fontSize: 12 }}>
                    <span style={{ color: MUTED }}>Instagram: </span>
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>{selected.captionLength.instagram} chars</span>
                  </div>
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 14px", fontSize: 12 }}>
                    <span style={{ color: MUTED }}>Facebook: </span>
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>{selected.captionLength.facebook} chars</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lightbox */}
        {lightbox && imgSrc && (
          <div onClick={() => setLightbox(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, cursor: "zoom-out" }}>
            <img src={imgSrc} alt="Full size" style={{ maxWidth: "88vw", maxHeight: "92vh", borderRadius: 8 }} />
            <div style={{ position: "absolute", top: 20, right: 24, color: MUTED, fontSize: 12 }}>Click to close</div>
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: 40 }} />

        {/* Setup checklist */}
        <div style={{ marginBottom: 48 }}>
          <div className="bebas" style={{ fontSize: 32, letterSpacing: 2, marginBottom: 24, color: "#fff" }}>
            SETUP <span style={{ color: ACCENT }}>CHECKLIST</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { done: true, label: "Next.js app deployed on Vercel" },
              { done: true, label: "RSS scraper + Bebas Neue image generator ready" },
              { done: true, label: "Cloudflare Worker deployed  cron every 10 minutes" },
              { done: true, label: "Cloudflare KV (SEEN_ARTICLES) created and bound" },
              { done: false, label: "Add INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_ACCOUNT_ID to Vercel env vars" },
              { done: false, label: "Add FACEBOOK_ACCESS_TOKEN + FACEBOOK_PAGE_ID to Vercel env vars" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: SURFACE, border: `1px solid ${item.done ? "#1a2e1a" : BORDER}`, borderRadius: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: item.done ? "#14532d" : "#1a1a1a", border: `2px solid ${item.done ? "#22c55e" : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.done && <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 900 }}></span>}
                </div>
                <span style={{ fontSize: 13, color: item.done ? "#ccc" : MUTED, fontWeight: item.done ? 500 : 400 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, color: GOLD }}></span>
            <span className="bebas" style={{ fontSize: 18, color: "#fff", letterSpacing: 2 }}>PPP</span>
            <span className="bebas" style={{ fontSize: 18, color: GOLD, letterSpacing: 2 }}>TV</span>
            <span style={{ fontSize: 10, color: MUTED, letterSpacing: 3, marginLeft: 2 }}>KENYA</span>
          </div>
          <span style={{ fontSize: 12, color: MUTED }}>Auto Poster  Powered by Vercel + Cloudflare</span>
        </div>

      </div>
    </div>
  );
}