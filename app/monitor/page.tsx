import Link from "next/link";
import { loadOfficeItems } from "@/lib/office";
import { MonitorClient } from "./ui/MonitorClient";

export default function MonitorPage() {
  const officeItems = loadOfficeItems();

  return (
    <div className="min-h-screen bg-[#05060a] text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-black/60 border-b border-white/10 px-4 lg:px-8 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-amber-300">ProPost Empire</div>
          <div className="text-xl font-semibold flex items-center gap-3">
            <span>Live Monitor</span>
            <span className="text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/30">
              Connected
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/cockpit" className="px-3 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10">
            Cockpit
          </Link>
          <Link href="/cockpit/office" className="px-3 py-2 rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-200">
            Virtual HQ
          </Link>
        </div>
      </header>

      <main className="px-4 lg:px-8 py-6 space-y-8">
        <MonitorClient officeItems={officeItems} />
      </main>
    </div>
  );
}
