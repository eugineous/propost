import Link from "next/link";

const companies = [
  {
    name: "XForce",
    focus: "X/Twitter",
    mission: "Verified, monetized, trend-jacking threads and replies in minutes.",
  },
  {
    name: "LinkedElite",
    focus: "LinkedIn",
    mission: "Boardroom-grade storytelling, exec outreach, and opportunity scouting.",
  },
  {
    name: "GramGod",
    focus: "Instagram",
    mission: "DM response in <5 minutes, reels that feel human, brand deal routing.",
  },
  {
    name: "PagePower",
    focus: "Facebook",
    mission: "Community-first replies, native video, smart boosts with ROAS guardrails.",
  },
  {
    name: "WebBoss",
    focus: "Web + SEO",
    mission: "Index, secure, and ship fast pages that feed every other channel.",
  },
  {
    name: "IntelCore",
    focus: "Command",
    mission: "Daily Situation Report, crisis radar, and cross-platform repurposing.",
  },
];

const capabilities = [
  "CrewAI + Gemini 2.5 orchestration with role-specific agents.",
  "Daily learning loop that rewrites posting strategy from live performance data.",
  "Crisis freeze switch, ban-risk scanner, and tone guardrails per platform.",
  "5-minute SLA on DM/priority replies; 10-minute SLA on trend reactions.",
  "Full Supabase telemetry with export to IntelCore memory lake.",
  "Canvas “Situation Room” visualization of every agent and task.",
];

const quickStats = [
  { label: "Platforms", value: "5", detail: "X, LinkedIn, IG, Facebook, Web" },
  { label: "Agents", value: "29", detail: "Across 6 companies + command" },
  { label: "SLA", value: "<5m", detail: "DM & priority replies" },
  { label: "Trends", value: "10m", detail: "Max lag to action on hot topics" },
];

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-16 pt-10 md:px-6 lg:px-8">
      <section className="grid gap-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 shadow-glow md:grid-cols-[1.4fr,1fr]">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">ProPost</p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            The autonomous social media empire for Eugine Micah.
          </h1>
          <p className="text-base text-white/75">
            Six specialist companies, one command center. Agents write, reply, trend-jack,
            and self-improve 24/7—without getting banned or embarrassing the brand.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/cockpit"
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-amber-500/30 hover:bg-amber-300"
            >
              Enter Command Center
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:border-white hover:bg-white/10"
            >
              Log in as Eugine
            </Link>
            <Link
              href="https://github.com/eugineous/propost/tree/codex/propost-spec/propost-agent-offices-300.md"
              className="text-sm text-cyan-300 hover:text-white"
              target="_blank"
              rel="noreferrer"
            >
              See 300-point office spec →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {quickStats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-white/60">{item.label}</div>
                <div className="text-2xl font-semibold text-white">{item.value}</div>
                <div className="text-xs text-white/60">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6 shadow-inner shadow-black/40">
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-amber-300">IntelCore</div>
          <div className="space-y-2 text-sm text-white/80">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span>Situation Report</span>
              <span className="text-emerald-300">07:00 EAT</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-white">Crisis Radar</div>
              <div className="text-xs text-emerald-300">No active incidents</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-white">Trend Reaction</div>
              <div className="text-xs text-white/70">Queue: 2 threads, 5 replies</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-white">DM SLA</div>
              <div className="text-xs text-emerald-300">&lt; 5 minutes live</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-white">Monetization</div>
              <div className="text-xs text-white/70">X impressions: 3.2M / 5M sprint</div>
            </div>
          </div>
          <p className="text-xs text-white/60">
            Pixel Office, real-time tasks, and per-agent animations live inside the cockpit.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Companies</p>
            <h2 className="text-2xl font-semibold text-white">Six subsidiaries, one founder.</h2>
            <p className="text-sm text-white/70">
              Each company has its own CEO, crew, and playbooks—reporting into IntelCore.
            </p>
          </div>
          <Link href="/cockpit/overview" className="text-sm text-cyan-300 hover:text-white">
            View cockpit overview →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {companies.map((co) => (
            <div key={co.name} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">{co.focus}</div>
              <div className="text-white text-lg font-semibold">{co.name}</div>
              <p className="text-sm text-white/70">{co.mission}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Capabilities</p>
        <h2 className="text-2xl font-semibold text-white">Built to act like superhumans.</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {capabilities.map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/20 via-white/5 to-transparent p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Get Started</p>
        <h2 className="text-2xl font-semibold text-white">Spin up the empire in three steps</h2>
        <ol className="space-y-2 text-sm text-white/80">
          <li>1) Login as Eugine, connect platform tokens, and set today’s priority.</li>
          <li>2) Choose which company leads the sprint (XForce, LinkedElite, etc.).</li>
          <li>3) Review IntelCore Situation Report at 07:00 EAT and approve high-stakes posts.</li>
        </ol>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black shadow hover:bg-amber-100"
          >
            Login
          </Link>
          <Link
            href="/cockpit"
            className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Open Cockpit
          </Link>
        </div>
      </section>
    </div>
  );
}
