# ProPost Empire — Cloudflare Worker Setup

This worker handles **all cron triggers** and **webhook reception** for ProPost.
Vercel has zero cron configuration — everything is driven from here.

## What it does

| Trigger | Frequency | Endpoint called |
|---------|-----------|-----------------|
| Health check | Every 5 min | `POST /api/cron/health` |
| Content schedule | Every 15 min | `POST /api/cron/content-schedule` |
| AI News | 03:00, 09:00, 15:00, 21:00 UTC | `POST /api/cron/ai-news` |
| Analytics pull | 02:00 UTC daily | `POST /api/cron/analytics` |
| X post | Top of every hour | `POST /api/cron/x-post` |

Webhooks are received at `/webhook/{x,instagram,facebook,linkedin}`, HMAC-verified, and forwarded to your Vercel app.

## Deploy steps

```bash
cd cloudflare-worker
npm install

# 1. Create KV namespace
wrangler kv:namespace create WEBHOOK_KV
# Copy the id into wrangler.toml → kv_namespaces[0].id

# 2. Set all secrets (never put real values in wrangler.toml)
wrangler secret put PROPOST_URL          # e.g. https://your-app.vercel.app
wrangler secret put CRON_SECRET          # same value as Vercel CRON_SECRET env var
wrangler secret put INTERNAL_SECRET      # same value as Vercel INTERNAL_SECRET env var
wrangler secret put WEBHOOK_VERIFY_TOKEN # your Meta webhook verify token
wrangler secret put X_WEBHOOK_SECRET     # X consumer secret
wrangler secret put INSTAGRAM_APP_SECRET # Meta app secret
wrangler secret put FACEBOOK_APP_SECRET  # Meta app secret (same as Instagram if same app)
wrangler secret put LINKEDIN_CLIENT_SECRET
wrangler secret put X_BROWSER_POSTER_URL # URL of your X browser poster worker

# 3. Deploy
wrangler deploy

# 4. Tail logs in real time
wrangler tail
```

## Manual trigger (for testing)

```bash
curl -X POST https://propost-empire.<your-subdomain>.workers.dev/trigger \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"job": "ai-news"}'
```

Omit the `job` field to trigger all jobs at once.

## Vercel env vars required

Make sure these are set in your Vercel project:

```
CRON_SECRET=<same value as worker secret>
INTERNAL_SECRET=<same value as worker secret>
DATABASE_URL=<neon connection string>
GEMINI_API_KEY=...
NVIDIA_API_KEY=...
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_BUSINESS_ACCOUNT_ID=...
FACEBOOK_ACCESS_TOKEN=...
FACEBOOK_PAGE_ID=...
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_PERSON_URN=...
VERCEL_DEPLOY_HOOK_URL=...
X_WEBHOOK_SECRET=...
INSTAGRAM_APP_SECRET=...
FACEBOOK_APP_SECRET=...
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=...
FACEBOOK_WEBHOOK_VERIFY_TOKEN=...
```
