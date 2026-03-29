# ProPost Empire — Environment Variables Setup Guide

Copy `.env.local` and fill in each value using the sources below.

---

## Database — Neon Postgres

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | [neon.tech](https://neon.tech) → New Project → Connection String |

---

## Auth — Google OAuth + NextAuth

| Variable | Description | Where to get it |
|---|---|---|
| `NEXTAUTH_URL` | Your app URL (e.g. `https://propost.vercel.app`) | Set manually |
| `NEXTAUTH_SECRET` | Random secret | Run: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Same as above |

Authorized redirect URI to add: `https://your-domain.vercel.app/api/auth/callback/google`

---

## AI APIs

| Variable | Description | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | Gemini 2.5 Pro API key | [aistudio.google.com](https://aistudio.google.com) → Get API Key |
| `NVIDIA_API_KEY` | NVIDIA NIM API key | [build.nvidia.com](https://build.nvidia.com) → Get API Key |
| `NVIDIA_BASE_URL` | NVIDIA NIM base URL | `https://integrate.api.nvidia.com/v1` (default) |

---

## X / Twitter API v2

| Variable | Description | Where to get it |
|---|---|---|
| `TWITTER_API_KEY` | API Key | [developer.twitter.com](https://developer.twitter.com) → Projects & Apps → Keys |
| `TWITTER_API_SECRET` | API Key Secret | Same |
| `TWITTER_ACCESS_TOKEN` | Access Token | Same → Authentication Tokens |
| `TWITTER_ACCESS_SECRET` | Access Token Secret | Same |
| `TWITTER_BEARER_TOKEN` | Bearer Token | Same |

Requires: Elevated access. Apply at developer.twitter.com.

---

## Instagram / Facebook Graph API

| Variable | Description | Where to get it |
|---|---|---|
| `INSTAGRAM_ACCESS_TOKEN` | Long-lived Instagram access token | [developers.facebook.com](https://developers.facebook.com) → App → Instagram Graph API |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Instagram Business Account ID | Facebook Business Manager |
| `FACEBOOK_PAGE_ID` | Facebook Page ID | Facebook Page → About |
| `FACEBOOK_ACCESS_TOKEN` | Facebook Page access token | developers.facebook.com → Graph API Explorer |

Required permissions: `instagram_basic`, `instagram_manage_messages`, `pages_manage_posts`, `pages_read_engagement`

---

## LinkedIn API

| Variable | Description | Where to get it |
|---|---|---|
| `LINKEDIN_CLIENT_ID` | LinkedIn App Client ID | [linkedin.com/developers](https://linkedin.com/developers) → Create App |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn App Client Secret | Same |
| `LINKEDIN_ACCESS_TOKEN` | OAuth 2.0 access token | Implement OAuth flow or use LinkedIn token generator |

Note: Content posting requires Marketing Developer Platform access. Apply at linkedin.com/developers.

---

## Cloudflare

| Variable | Description | Where to get it |
|---|---|---|
| `CF_ACCOUNT_ID` | Cloudflare Account ID | [dash.cloudflare.com](https://dash.cloudflare.com) → Right sidebar |
| `CF_KV_AGENT_STATE_ID` | KV Namespace ID for agent state | Cloudflare Dashboard → Workers & Pages → KV → Create namespace "AGENT_STATE" |
| `CF_API_TOKEN` | Cloudflare API token | Cloudflare Dashboard → My Profile → API Tokens → Create Token (KV read/write permissions) |

---

## Gmail API (for SCRIBE reports + SENTRY alerts)

| Variable | Description | Where to get it |
|---|---|---|
| `GMAIL_CLIENT_ID` | Gmail OAuth client ID | [console.cloud.google.com](https://console.cloud.google.com) → Enable Gmail API → Create OAuth credentials |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth client secret | Same |
| `GMAIL_REFRESH_TOKEN` | Gmail refresh token | Use OAuth Playground: [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground) with scope `https://mail.google.com/` |
| `GMAIL_FROM` | Sender email address | e.g. `propost-system@gmail.com` |
| `EUGINE_EMAIL` | Eugine's email for reports | `euginemicah@gmail.com` |

---

## Security

| Variable | Description | Where to get it |
|---|---|---|
| `CRON_SECRET` | Secret for cron job authentication | Run: `openssl rand -base64 32` |
| `INTERNAL_SECRET` | Shared secret between Cloudflare Worker and Vercel | Run: `openssl rand -base64 32` |

---

## GitHub Secrets (for CI/CD)

Add these in GitHub → Repository → Settings → Secrets and variables → Actions:

| Secret | Description |
|---|---|
| `VERCEL_TOKEN` | Vercel API token from vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Vercel org ID from vercel.com/account |
| `VERCEL_PROJECT_ID` | Vercel project ID from project settings |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Worker deploy permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

---

## Vercel Environment Variables

In Vercel project settings → Environment Variables, add all the above variables for Production, Preview, and Development environments.

The `DATABASE_URL` must point to your Neon Postgres database with SSL enabled.
