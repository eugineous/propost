"use client";
import { useState, useEffect, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const PINK = "#FF007A", RED = "#E50914";
const CATS_FILTER = ["ALL","CELEBRITY","MUSIC","TV & FILM","FASHION","EVENTS","AWARDS","EAST AFRICA","GENERAL"];
const CATS_POST   = ["AUTO","CELEBRITY","MUSIC","TV & FILM","FASHION","EVENTS","AWARDS","EAST AFRICA","GENERAL"];

const CAT_COLOR: Record<string, string> = {
  CELEBRITY:"#FF007A", NEWS:"#FF007A", POLITICS:"#FF007A", FASHION:"#FF007A",
  MUSIC:"#FF6B00", "TV & FILM":"#3b82f6", MOVIES:"#3b82f6",
  SPORTS:"#00CFFF", TECHNOLOGY:"#FFE600", BUSINESS:"#FFD700", AWARDS:"#FFD700",
  ENTERTAINMENT:"#9B30FF", EVENTS:"#22C55E", "EAST AFRICA":"#F97316", GENERAL:"#E50914",
};
const cc = (cat: string) => CAT_COLOR[cat?.toUpperCase()] ?? RED;

// ── Types ─────────────────────────────────────────────────────────────────────
interface LogEntry {
  articleId: string; title: string; url: string; category: string;
  manualPost?: boolean; isBreaking?: boolean;
  instagram: { success: boolean; postId?: string; error?: string };
  facebook:  { success: boolean; postId?: string; error?: string };
  postedAt: string;
}
interface Preview {
  scraped: { type: string; title: string; description: string; imageUrl: string; sourceName: string; isVideo?: boolean; videoEmbedUrl?: string|null; videoUrl?: string|null };
  ai: { clickbaitTitle: string; caption: string };
  category: string; imageBase64: string;
}
interface Retry { loading: boolean; done?: boolean; error?: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
function ago(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}
function Spin() {
  return <span style={{ display:"inline-block", width:13, height:13, border:"2px solid rgba(255,255,255,.25)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .7s linear infinite" }} />;
}
