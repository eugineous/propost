"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/dashboard",   icon: "?", label: "Dashboard"   },
  { href: "/posts",       icon: "??", label: "All Posts"   },
  { href: "/composer", icon: "🎬", label: "Composer" },
  { href: "/social",      icon: "??", label: "Social"      },
  { href: "/categories",  icon: "???",  label: "Categories"  },
  { href: "/brand",       icon: "??", label: "Brand"       },
  { href: "/health",      icon: "??", label: "Site Health" },
  { href: "/errors",      icon: "??", label: "Error Log"   },
  { href: "/settings",    icon: "??",  label: "Settings"    },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  const Sidebar = () => (
    <aside style={{
      width: 220, background: "#111", borderRight: "1px solid #222",
      display: "flex", flexDirection: "column", height: "100dvh",
      position: "sticky", top: 0, flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #222" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E50914", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>
            PPP<span style={{ color: "#E50914" }}>TV</span>
          </span>
        </div>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginTop: 2, paddingLeft: 16 }}>ADMIN PLATFORM</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {NAV.map(n => {
          const active = path.startsWith(n.href);
          return (
            <button key={n.href} onClick={() => router.push(n.href)} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "10px 12px", borderRadius: 8,
              background: active ? "#1e1e1e" : "none",
              border: "none", borderLeft: active ? "3px solid #E50914" : "3px solid transparent",
              color: active ? "#fff" : "#666", fontSize: 13, fontWeight: active ? 700 : 400,
              cursor: "pointer", textAlign: "left", transition: "all .15s",
            }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #222" }}>
        <button onClick={logout} style={{
          width: "100%", padding: "8px 12px", background: "none",
          border: "1px solid #333", borderRadius: 8, color: "#666",
          fontSize: 12, cursor: "pointer",
        }}>Sign Out</button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "#0f0f0f" }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#111}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
        .card{background:#161616;border:1px solid #222;border-radius:12px}
        .btn{border:none;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;transition:opacity .15s;font-family:inherit}
        .btn:disabled{opacity:.4;cursor:not-allowed}
        .btn-red{background:#E50914;color:#fff}
        .btn-red:hover:not(:disabled){opacity:.85}
        .btn-ghost{background:none;border:1px solid #333;color:#888;padding:8px 14px;font-size:12px;cursor:pointer;border-radius:8px;font-family:inherit}
        .btn-ghost:hover{border-color:#555;color:#fff}
        .input{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:10px 14px;color:#fff;font-size:14px;outline:none;width:100%;font-family:inherit}
        .input:focus{border-color:#444}
        .tag{border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;display:inline-block}
        .stat-card{background:#161616;border:1px solid #222;border-radius:12px;padding:20px}
        @media(max-width:767px){.sidebar-wrap{display:none!important}.mobile-bar{display:flex!important}}
        @media(min-width:768px){.sidebar-wrap{display:flex!important}.mobile-bar{display:none!important}}
      `}</style>

      {/* Desktop sidebar */}
      <div className="sidebar-wrap" style={{ display: "none" }}>
        <Sidebar />
      </div>

      {/* Mobile top bar */}
      <div className="mobile-bar" style={{
        display: "none", position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "#111", borderBottom: "1px solid #222",
        padding: "12px 16px", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 18, fontWeight: 900 }}>PPP<span style={{ color: "#E50914" }}>TV</span> <span style={{ fontSize: 11, color: "#555" }}>ADMIN</span></span>
        <button onClick={() => setMobileOpen(o => !o)} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>?</button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
          <div style={{ width: 220, background: "#111", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 900 }}>PPP<span style={{ color: "#E50914" }}>TV</span></span>
              <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>?</button>
            </div>
            <nav style={{ flex: 1, padding: "10px 8px" }}>
              {NAV.map(n => (
                <button key={n.href} onClick={() => { router.push(n.href); setMobileOpen(false); }} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 12px", borderRadius: 8, background: path.startsWith(n.href) ? "#1e1e1e" : "none",
                  border: "none", color: path.startsWith(n.href) ? "#fff" : "#666",
                  fontSize: 13, cursor: "pointer", textAlign: "left",
                }}>
                  <span>{n.icon}</span><span>{n.label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,.7)" }} onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <main style={{ flex: 1, overflowY: "auto", paddingTop: 0 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}

