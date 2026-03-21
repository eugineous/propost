# PPP TV Auto Poster — Deploy Guide

## What goes where

| Service               | Role                                                     |
| --------------------- | -------------------------------------------------------- |
| **Vercel**            | Hosts the Next.js app (image generation, social posting) |
| **Cloudflare Worker** | Cron scheduler + deduplication via KV                    |
| **Cloudflare KV**     | Stores seen article IDs (replaces Upstash)               |

---

## Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "PPP TV Auto Poster"
# Create repo at github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/auto-news-station.git
git push -u origin main
```

---

## Step 2 — Deploy on Vercel

1. Go to https://vercel.com/new → import your GitHub repo
2. Framework: Next.js (auto-detected)
3. Add these Environment Variables:

| Key                      | Value                              |
| ------------------------ | ---------------------------------- |
| `AUTOMATE_SECRET`        | any random string e.g. `abc123xyz` |
| `INSTAGRAM_ACCESS_TOKEN` | add later                          |
| `INSTAGRAM_ACCOUNT_ID`   | add later                          |
| `FACEBOOK_ACCESS_TOKEN`  | add later                          |
| `FACEBOOK_PAGE_ID`       | add later                          |

4. Deploy. Note your URL: `https://your-app.vercel.app`

---

## Step 3 — Cloudflare Worker + KV

```bash
# Install wrangler
npm install -g wrangler

# Login
wrangler login

# Go to cloudflare folder
cd cloudflare

# Create KV namespace
wrangler kv:namespace create SEEN_ARTICLES
# → Copy the returned id and paste it into wrangler.toml under id = "..."

# Set secrets
wrangler secret put VERCEL_APP_URL
# paste: https://your-app.vercel.app

wrangler secret put AUTOMATE_SECRET
# paste: same value as in Vercel

# Deploy
wrangler deploy
```

---

## Step 4 — Test

- Preview image: `https://your-app.vercel.app/api/preview-image`
- Dry run (no posting): `https://your-app.vercel.app/api/dry-run`
- Manual Worker trigger: `https://ppptv-auto-poster.YOUR_SUBDOMAIN.workers.dev/trigger`

---

## Step 5 — Add Social Tokens (when ready)

Add to Vercel Environment Variables and redeploy:

- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_ACCOUNT_ID`
- `FACEBOOK_ACCESS_TOKEN`
- `FACEBOOK_PAGE_ID`

The Worker cron runs every 30 minutes automatically after deploy.
