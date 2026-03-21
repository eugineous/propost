#!/bin/bash
# PPP TV Auto Poster — One-shot deploy script
# Run this after setting up your GitHub repo

set -e

echo "=== PPP TV Auto Poster Deploy ==="
echo ""

# 1. Check git
if [ ! -d ".git" ]; then
  echo "Initializing git..."
  git init
  git add .
  git commit -m "PPP TV Auto Poster — initial commit"
else
  echo "Git already initialized. Committing latest changes..."
  git add .
  git commit -m "update" --allow-empty
fi

echo ""
echo "=== Step 1: Push to GitHub ==="
echo "Make sure you've created a repo at github.com and run:"
echo "  git remote add origin https://github.com/YOUR_USERNAME/auto-news-station.git"
echo "  git push -u origin main"
echo ""

echo "=== Step 2: Vercel ==="
echo "1. Go to https://vercel.com/new"
echo "2. Import your GitHub repo"
echo "3. Add these environment variables:"
echo ""
echo "   AUTOMATE_SECRET        = $(openssl rand -hex 16 2>/dev/null || echo 'generate-a-random-string')"
echo "   UPSTASH_REDIS_REST_URL = https://your-db.upstash.io"
echo "   UPSTASH_REDIS_REST_TOKEN = your_token"
echo "   INSTAGRAM_ACCESS_TOKEN = (add later)"
echo "   INSTAGRAM_ACCOUNT_ID   = (add later)"
echo "   FACEBOOK_ACCESS_TOKEN  = (add later)"
echo "   FACEBOOK_PAGE_ID       = (add later)"
echo ""

echo "=== Step 3: Cloudflare Worker ==="
echo "Run these commands:"
echo ""
echo "  npm install -g wrangler"
echo "  wrangler login"
echo "  cd cloudflare"
echo "  wrangler secret put VERCEL_APP_URL"
echo "    → paste: https://your-app.vercel.app"
echo "  wrangler secret put AUTOMATE_SECRET"
echo "    → paste: same value as in Vercel"
echo "  wrangler deploy"
echo ""

echo "=== Step 4: Upstash Redis (free) ==="
echo "1. Go to https://console.upstash.com"
echo "2. Create a new Redis database (free tier)"
echo "3. Copy REST URL and REST Token into Vercel env vars"
echo ""

echo "=== Done! ==="
echo "Once deployed, test at: https://your-app.vercel.app"
echo "Preview image: https://your-app.vercel.app/api/preview-image"
echo "Dry run: https://your-app.vercel.app/api/dry-run"
