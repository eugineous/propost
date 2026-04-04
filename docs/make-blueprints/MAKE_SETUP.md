# ProPost × Make.com — Webhook Scenario Setup

Make.com's Free plan blocks blueprint modification via API token. These blueprints must be imported **manually** through the Make.com dashboard UI.

## How to Import a Blueprint

1. Go to [eu2.make.com](https://eu2.make.com)
2. Open the scenario you want to update (e.g. "ProPost → LinkedIn")
3. Click the **`...`** menu (top-right of the canvas)
4. Select **"Import Blueprint"**
5. Paste the full contents of the corresponding `.json` file from this folder
6. Click **Save**
7. Toggle the scenario **Active** (the switch in the top-left)

> ⚠️ Free plan allows only **2 active scenarios** at a time and **1,000 operations/month**. Choose wisely.

---

## Scenario Status

| Platform   | Scenario ID | Blueprint File       | Connection Status         | Action |
|------------|-------------|----------------------|---------------------------|--------|
| LinkedIn   | 8975504     | `linkedin.json`      | ✅ Valid (expires 2026-11) | Import & activate |
| Reddit     | 8975507     | `reddit.json`        | ✅ Valid (no expiry)       | Import & activate |
| Facebook   | 8975503     | `facebook.json`      | ❌ Expired (2026-03-05)    | Reconnect Facebook, then import |
| X/Twitter  | 8975501     | `x.json`             | ❌ No X connection         | Connect X account in Make.com, then import |
| Instagram  | 8975502     | `instagram.json`     | ❌ No Instagram connection | Connect Instagram Business in Make.com, then import |
| TikTok     | 8975505     | `tiktok.json`        | ❌ No TikTok connection    | Connect TikTok in Make.com, then import |
| YouTube    | 8975506     | `youtube.json`       | ⚠️ Google conn. exists    | Import (uses Google connection 12971423) — needs YouTube scope |
| Mastodon   | 8975508     | `mastodon.json`      | ⚠️ HTTP module            | Add your Mastodon access token, then import |
| Truth Social | 8975509   | `truthsocial.json`   | ⚠️ HTTP module            | Add your Truth Social access token, then import |

---

## Platform-Specific Notes

### LinkedIn ✅ Ready to import
The `linkedin.json` blueprint uses connection **12971453** (expires 2026-11-10).
Maps `{{1.content}}` from the webhook payload to the LinkedIn share text.
**Import and activate this now.**

### Reddit ✅ Ready to import
The `reddit.json` blueprint uses connection **10212956**.
- Maps `{{1.subreddit}}` → subreddit name (defaults to "artificial" if empty)
- Maps `{{1.title}}` → post title (defaults to first 100 chars of content if empty)
- Maps `{{1.content}}` → post body

ProPost sends `subreddit` and `title` fields in the webhook payload for Reddit posts.
**Import and activate this now.**

### Facebook ❌ Needs reconnection
The Facebook connection (ID: 13440088) expired on 2026-03-05.
1. In Make.com, go to **Connections** → Find "Facebook"
2. Click **Reconnect** and re-authorize your Facebook account
3. Update the blueprint's connection ID if a new connection is created
4. Import `facebook.json`

> Note: ProPost already posts to Facebook directly via the Facebook Graph API. This Make.com scenario is a redundant backup.

### X/Twitter ❌ Needs X connection
1. In Make.com, go to **Connections** → **Add connection** → Search "X (Twitter)"
2. Connect your X account (@eugineroylandz)
3. Note the new connection ID
4. In `x.json`, replace `__REPLACE_WITH_YOUR_X_CONNECTION_ID__` with the actual ID
5. Import `x.json`

> Note: ProPost already posts to X directly via the Twitter API v2. This Make.com scenario is a redundant backup.

### Instagram ❌ Needs Instagram Business connection
1. In Make.com, go to **Connections** → **Add connection** → Search "Instagram for Business"
2. Connect your Instagram Business account
3. Note the new connection ID
4. In `instagram.json`, replace `__REPLACE_WITH_INSTAGRAM_CONNECTION_ID__` with the actual ID
5. Import `instagram.json`

> Note: ProPost already posts to Instagram directly via the Graph API. This Make.com scenario is a redundant backup.

### TikTok ❌ Needs TikTok connection
1. In Make.com, go to **Connections** → **Add connection** → Search "TikTok"
2. Connect your TikTok account
3. Note the new connection ID
4. In `tiktok.json`, replace `__REPLACE_WITH_TIKTOK_CONNECTION_ID__` with the actual ID
5. Import `tiktok.json`

> TikTok requires video uploads. The `media_url` field in the ProPost webhook payload should point to a video file URL.

### YouTube ⚠️ Google connection available
The `youtube.json` blueprint references Google connection **12971423** (euginemicah@gmail.com).
This connection may need YouTube-specific scopes:
1. In Make.com, open the YouTube scenario
2. When you import the blueprint and the connection prompts for YouTube permission, re-authorize with YouTube scope
3. The blueprint maps `{{1.title}}`, `{{1.content}}` (description), and `{{1.media_url}}` (video URL)

### Mastodon ⚠️ Needs access token
1. Log in to your Mastodon instance
2. Go to **Settings → Development → New Application**
3. Create an app, copy the **Access Token**
4. In `mastodon.json`, replace `__REPLACE_WITH_MASTODON_ACCESS_TOKEN__` with your token
5. Update the URL if your instance isn't `mastodon.social`
6. Import `mastodon.json`

### Truth Social ⚠️ Needs access token
1. Get your Truth Social access token (Truth Social uses the Mastodon API)
2. In `truthsocial.json`, replace `__REPLACE_WITH_TRUTHSOCIAL_ACCESS_TOKEN__` with your token
3. Import `truthsocial.json`

---

## Webhook Payload Structure

ProPost sends this JSON to every Make.com webhook:

```json
{
  "platform": "linkedin",
  "content": "The post text goes here...",
  "media_url": null,
  "title": null,
  "subreddit": null,
  "pillar": "ai_news",
  "agent": "ORATOR",
  "timestamp": "2026-04-04T12:00:00.000Z",
  "source": "propost_empire"
}
```

In Make.com blueprint mappers, reference these as `{{1.content}}`, `{{1.media_url}}`, `{{1.subreddit}}`, etc.

---

## Free Plan Limits

- **2 active scenarios** at a time
- **1,000 operations/month** (each scenario run = 1 operation)
- ProPost triggers each webhook every time the agent posts → ~48 X posts/day = 1,440/month

**Recommendation**: Activate only LinkedIn and Reddit (the platforms ProPost can't post to directly). X, Instagram, Facebook, and LinkedIn already work via ProPost's direct API adapters.
