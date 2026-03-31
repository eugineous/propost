#!/bin/bash
# ProPost Empire — Pre-Deploy Cleanup
# Removes all old/corrupted files before pushing the new build.
# Run this ONCE before your first deployment of the new system.
# Safe: preserves .env.local, node_modules, .git, .kiro, and all new files.

set -e

echo "🧹 ProPost Empire — Pre-Deploy Cleanup"
echo "======================================="
echo ""
echo "This will remove old/corrupted files from the previous ProPost version."
echo "Your .env.local, node_modules, .git, and all new files are safe."
echo ""
read -p "Continue? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

# ── Remove old Cloudflare worker files that are now replaced ──────────────────
echo "→ Cleaning old cloudflare-worker files..."
rm -f cloudflare-worker/autopilot-cron.js

# ── Remove old drizzle migration files (replaced by lib/db/migrations/) ───────
echo "→ Cleaning old drizzle files..."
rm -f drizzle.config.ts
rm -rf drizzle/

# ── Remove old .claude agent files (not needed for ProPost) ───────────────────
echo "→ Cleaning .claude directory..."
rm -rf .claude/

# ── Remove old docs ────────────────────────────────────────────────────────────
echo "→ Cleaning old docs..."
rm -f docs/env-setup.md

# ── Remove old hooks directory ─────────────────────────────────────────────────
echo "→ Cleaning old hooks..."
rm -rf hooks/

# ── Verify new structure is intact ────────────────────────────────────────────
echo ""
echo "✅ Verifying new structure..."

required_files=(
  "app/page.tsx"
  "app/layout.tsx"
  "app/monitor/page.tsx"
  "app/tasks/page.tsx"
  "app/inbox/page.tsx"
  "app/content/page.tsx"
  "app/analytics/page.tsx"
  "app/memory/page.tsx"
  "app/settings/page.tsx"
  "app/office/page.tsx"
  "lib/agents/sovereign.ts"
  "lib/agents/index.ts"
  "lib/ai/router.ts"
  "lib/ai/gemini.ts"
  "lib/ai/nvidia.ts"
  "lib/db/schema.ts"
  "lib/db/client.ts"
  "lib/db/migrations/001_initial_schema.sql"
  "lib/db/migrations/002_indexes.sql"
  "lib/hawk/engine.ts"
  "lib/fallback/engine.ts"
  "lib/security/red-team.ts"
  "lib/content/pillars.ts"
  "lib/content/formatter.ts"
  "lib/content/ai-news-source.ts"
  "cloudflare-worker/src/index.ts"
  "cloudflare-worker/wrangler.toml"
  ".env.example"
  "vercel.json"
  "next.config.js"
)

all_ok=true
for f in "${required_files[@]}"; do
  if [[ -f "$f" ]]; then
    echo "  ✓ $f"
  else
    echo "  ✗ MISSING: $f"
    all_ok=false
  fi
done

echo ""
if [[ "$all_ok" == "true" ]]; then
  echo "✅ All required files present. Ready to deploy."
  echo ""
  echo "Next steps:"
  echo "  1. git add -A"
  echo "  2. git commit -m 'feat: ProPost Empire v4.0 — full rebuild'"
  echo "  3. git push"
  echo "  4. Deploy Cloudflare Worker: cd cloudflare-worker && wrangler deploy"
else
  echo "❌ Some files are missing. Do not deploy until all files are present."
  exit 1
fi
