"use client";
import Shell from "../shell";

export default function QueuePage() {
  return (
    <Shell>
      <div style={{ padding: "40px 24px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, letterSpacing: 2, marginBottom: 8 }}>
          Post <span style={{ color: "#E50914" }}>Queue</span>
        </div>
        <p style={{ fontSize: 13, color: "#555", marginBottom: 32 }}>Schedule posts for later. Coming soon.</p>
        <div style={{ background: "#1f1f1f", border: "1px solid #2a2a2a", borderRadius: 10, padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Scheduling Queue</div>
          <div style={{ fontSize: 13, color: "#555" }}>Queue posts to go out at specific times. Connect your accounts to get started.</div>
        </div>
      </div>
    </Shell>
  );
}
