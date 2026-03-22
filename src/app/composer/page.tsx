"use client";
import { useState, useRef, useCallback } from "react";

const PINK = "#FF007A";
const SECRET = process.env.NEXT_PUBLIC_AUTOMATE_SECRET || "";

type Tab = "video" | "carousel";
type Status = "idle" | "loading" | "success" | "error";

// ── helpers ──────────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function getSecret(): Promise<string> {
  const r = await fetch("/api/automate-secret");
  if (r.ok) { const d = await r.json(); return d.secret || ""; }
  return "";
}

// ── Video Tab ─────────────────────────────────────────────────────────────────
function VideoTab() {
  const [url, setUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<any>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const CATS = ["GENERAL","CELEBRITY","MUSIC","TV & FILM","FASHION","EVENTS","EAST AFRICA","COMEDY","INFLUENCERS"];

  async function handlePreview() {
    if (!url.trim()) return;
    setPreviewing(true);
    setThumbPreview(null);
    try {
      const r = await fetch("/api/preview-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await r.json();
      if (d.scraped?.imageUrl) setThumbPreview(d.scraped.imageUrl);
      if (!headline && d.scraped?.title) setHeadline(d.scraped.title.toUpperCase().slice(0, 80));
    } catch {}
    setPreviewing(false);
  }

  async function handlePost() {
    if (!url.trim() || !headline.trim() || !caption.trim()) return;
    setStatus("loading");
    setResult(null);
    try {
      const secret = await getSecret();
      const r = await fetch("/api/post-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + secret },
        body: JSON.stringify({ url: url.trim(), headline: headline.trim(), caption: caption.trim(), category }),
      });
      const d = await r.json();
      setResult(d);
      setStatus(d.success ? "success" : "error");
    } catch (err: any) {
      setResult({ error: err.message });
      setStatus("error");
    }
  }

  const canPost = url.trim() && headline.trim() && caption.trim() && status !== "loading";

  return (
    <div className="space-y-5">
      {/* URL input */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Video URL</label>
        <div className="flex gap-2">
          <input
            value={url} onChange={e => setUrl(e.target.value)}
            onBlur={handlePreview}
            placeholder="YouTube, TikTok, Instagram, or direct .mp4 URL"
            className="flex-1 bg-[#111] border border-[#222] rounded px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF007A]"
          />
          <button onClick={handlePreview} disabled={!url.trim() || previewing}
            className="px-4 py-3 text-xs font-black uppercase tracking-widest rounded transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: "#1a1a1a", border: "1px solid #333", color: "#fff" }}>
            {previewing ? "..." : "Preview"}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1">Thumbnail is auto-fetched from the video and smart-cropped to 4:5</p>
      </div>

      {/* Thumbnail preview */}
      {thumbPreview && (
        <div className="flex gap-4 items-start">
          <div className="shrink-0 rounded overflow-hidden" style={{ width: 90, aspectRatio: "4/5", background: "#111" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbPreview} alt="thumbnail" className="w-full h-full object-cover" style={{ objectPosition: "center top" }} />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Auto-fetched thumbnail · will be cropped to 4:5 with headline overlay</p>
        </div>
      )}

      {/* Headline */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Headline <span className="text-gray-600">(appears on thumbnail)</span></label>
        <input
          value={headline} onChange={e => setHeadline(e.target.value.toUpperCase())}
          placeholder="TYPE YOUR HEADLINE IN CAPS"
          maxLength={120}
          className="w-full bg-[#111] border border-[#222] rounded px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF007A] uppercase"
        />
        <p className="text-[10px] text-gray-600 mt-1">{headline.length}/120</p>
      </div>

      {/* Caption */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Caption <span className="text-gray-600">(Instagram & Facebook post text)</span></label>
        <textarea
          value={caption} onChange={e => setCaption(e.target.value)}
          placeholder="Write your caption here... add hashtags, emojis, etc."
          rows={5}
          className="w-full bg-[#111] border border-[#222] rounded px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF007A] resize-none"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="bg-[#111] border border-[#222] rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF007A]">
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Post button */}
      <button onClick={handlePost} disabled={!canPost}
        className="w-full py-4 text-sm font-black uppercase tracking-widest text-white rounded transition-opacity hover:opacity-85 disabled:opacity-40"
        style={{ background: canPost ? PINK : "#333" }}>
        {status === "loading" ? "Posting... (this takes ~60s for video processing)" : "Post Video to Instagram & Facebook"}
      </button>

      {/* Result */}
      {result && (
        <div className="rounded p-4 text-sm" style={{ background: status === "success" ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)", border: `1px solid ${status === "success" ? "#10b981" : "#ef4444"}` }}>
          {status === "success" ? (
            <div className="space-y-1">
              <p className="font-bold text-green-400">Posted successfully</p>
              {result.instagram?.success && <p className="text-gray-300 text-xs">Instagram ✓ {result.instagram.postId}</p>}
              {result.facebook?.success && <p className="text-gray-300 text-xs">Facebook ✓ {result.facebook.postId}</p>}
              {!result.instagram?.success && <p className="text-red-400 text-xs">Instagram ✗ {result.instagram?.error}</p>}
              {!result.facebook?.success && <p className="text-red-400 text-xs">Facebook ✗ {result.facebook?.error}</p>}
            </div>
          ) : (
            <p className="text-red-400">{result.error || "Post failed"}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Carousel Tab ──────────────────────────────────────────────────────────────
interface CarouselItem { type: "image" | "video"; file?: File; url?: string; preview?: string; base64?: string; }

function CarouselTab() {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [caption, setCaption] = useState("");
  const [headline, setHeadline] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<any>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const addCover = useCallback(async (file: File) => {
    const base64 = await fileToBase64(file);
    const preview = URL.createObjectURL(file);
    setItems(prev => {
      const rest = prev.filter((_, i) => i !== 0);
      return [{ type: "image", file, base64, preview }, ...rest];
    });
  }, []);

  const addMedia = useCallback(async (files: FileList) => {
    const newItems: CarouselItem[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        const base64 = await fileToBase64(file);
        const preview = URL.createObjectURL(file);
        newItems.push({ type: "image", file, base64, preview });
      } else if (file.type.startsWith("video/")) {
        const preview = URL.createObjectURL(file);
        newItems.push({ type: "video", file, preview });
      }
    }
    setItems(prev => [...prev, ...newItems].slice(0, 10));
  }, []);

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  async function handlePost() {
    if (items.length < 2 || !caption.trim()) return;
    setStatus("loading");
    setResult(null);

    try {
      // For video items, we need a URL not base64 — skip for now, only images in carousel
      const payload = items.map(item => ({
        type: item.type,
        base64: item.base64,
        url: item.url,
      }));

      const secret = await getSecret();
      const r = await fetch("/api/post-carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + secret },
        body: JSON.stringify({ items: payload, caption: caption.trim(), headline: headline.trim() }),
      });
      const d = await r.json();
      setResult(d);
      setStatus(d.success ? "success" : "error");
    } catch (err: any) {
      setResult({ error: err.message });
      setStatus("error");
    }
  }

  const canPost = items.length >= 2 && caption.trim() && status !== "loading";
  const hasCover = items.length > 0 && items[0].type === "image";

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">First image = cover. Add up to 9 more images after it. Max 10 total.</p>

      {/* Cover image */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Cover Image <span className="text-gray-600">(required, first slide)</span></label>
        <input ref={coverRef} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && addCover(e.target.files[0])} />
        {hasCover ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={items[0].preview} alt="cover" className="rounded object-cover" style={{ width: 120, height: 150, objectFit: "cover" }} />
            <button onClick={() => removeItem(0)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center"
              style={{ background: "rgba(0,0,0,.7)" }}>✕</button>
            <span className="absolute bottom-1 left-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: PINK, color: "#fff" }}>Cover</span>
          </div>
        ) : (
          <button onClick={() => coverRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full py-8 rounded border-2 border-dashed text-gray-500 hover:text-white hover:border-[#FF007A] transition-colors text-sm"
            style={{ borderColor: "#333" }}>
            + Upload Cover Image
          </button>
        )}
      </div>

      {/* Additional media */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Additional Images <span className="text-gray-600">(slides 2–10)</span></label>
        <input ref={mediaRef} type="file" accept="image/*,video/*" multiple className="hidden"
          onChange={e => e.target.files && addMedia(e.target.files)} />

        <div className="flex flex-wrap gap-2 mb-3">
          {items.slice(1).map((item, i) => (
            <div key={i} className="relative rounded overflow-hidden" style={{ width: 80, height: 100 }}>
              {item.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.preview} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={item.preview} className="w-full h-full object-cover" muted />
              )}
              <button onClick={() => removeItem(i + 1)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center"
                style={{ background: "rgba(0,0,0,.7)" }}>✕</button>
              <span className="absolute bottom-1 left-1 text-[9px] font-black uppercase tracking-widest px-1 py-0.5 rounded"
                style={{ background: "#1a1a1a", color: "#aaa" }}>{i + 2}</span>
            </div>
          ))}
          {items.length < 10 && (
            <button onClick={() => mediaRef.current?.click()}
              className="flex items-center justify-center rounded border-2 border-dashed text-gray-600 hover:text-white hover:border-[#FF007A] transition-colors text-xl"
              style={{ width: 80, height: 100, borderColor: "#333" }}>+</button>
          )}
        </div>
        <p className="text-[10px] text-gray-600">{items.length}/10 items</p>
      </div>

      {/* Headline */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Headline <span className="text-gray-600">(optional)</span></label>
        <input value={headline} onChange={e => setHeadline(e.target.value)}
          placeholder="Optional headline for Facebook post"
          className="w-full bg-[#111] border border-[#222] rounded px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF007A]"
        />
      </div>

      {/* Caption */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Caption</label>
        <textarea value={caption} onChange={e => setCaption(e.target.value)}
          placeholder="Write your caption... hashtags, emojis, etc."
          rows={5}
          className="w-full bg-[#111] border border-[#222] rounded px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF007A] resize-none"
        />
      </div>

      <button onClick={handlePost} disabled={!canPost}
        className="w-full py-4 text-sm font-black uppercase tracking-widest text-white rounded transition-opacity hover:opacity-85 disabled:opacity-40"
        style={{ background: canPost ? PINK : "#333" }}>
        {status === "loading" ? "Posting carousel..." : "Post Carousel to Instagram & Facebook"}
      </button>

      {result && (
        <div className="rounded p-4 text-sm" style={{ background: status === "success" ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)", border: `1px solid ${status === "success" ? "#10b981" : "#ef4444"}` }}>
          {status === "success" ? (
            <div className="space-y-1">
              <p className="font-bold text-green-400">Carousel posted</p>
              {result.instagram?.success && <p className="text-gray-300 text-xs">Instagram ✓ {result.instagram.postId}</p>}
              {result.facebook?.success && <p className="text-gray-300 text-xs">Facebook ✓ {result.facebook.postId}</p>}
              {!result.instagram?.success && <p className="text-red-400 text-xs">Instagram ✗ {result.instagram?.error}</p>}
              {!result.facebook?.success && <p className="text-red-400 text-xs">Facebook ✗ {result.facebook?.error}</p>}
            </div>
          ) : (
            <p className="text-red-400">{result.error || "Post failed"}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Composer Page ────────────────────────────────────────────────────────
export default function ComposerPage() {
  const [tab, setTab] = useState<Tab>("video");

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#fff" }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <a href="/dashboard" className="text-xs text-gray-600 hover:text-white transition-colors mb-4 inline-block">← Dashboard</a>
          <h1 className="text-2xl font-black uppercase tracking-widest" style={{ color: PINK }}>Composer</h1>
          <p className="text-gray-500 text-sm mt-1">Post a video or carousel manually to Instagram & Facebook</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded" style={{ background: "#111" }}>
          {([["video", "🎬 Video Post"], ["carousel", "🖼 Carousel"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded transition-all"
              style={tab === t ? { background: PINK, color: "#fff" } : { color: "#666" }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "video" ? <VideoTab /> : <CarouselTab />}
      </div>
    </div>
  );
}
