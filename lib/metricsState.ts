const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID
const CF_KV_AGENT_STATE_ID = process.env.CF_KV_AGENT_STATE_ID
const CF_API_TOKEN = process.env.CF_API_TOKEN

function canUseKv() {
  return Boolean(
    CF_ACCOUNT_ID &&
      CF_KV_AGENT_STATE_ID &&
      CF_API_TOKEN &&
      CF_ACCOUNT_ID !== 'placeholder' &&
      CF_KV_AGENT_STATE_ID !== 'placeholder'
  )
}

function kvBaseUrl() {
  return `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_AGENT_STATE_ID}/values`
}

function key(platform: string) {
  return `metrics:${platform}:lastSyncedAt`
}

export async function setMetricsLastSynced(platform: string, iso: string): Promise<void> {
  if (!canUseKv()) return
  const res = await fetch(`${kvBaseUrl()}/${encodeURIComponent(key(platform))}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'text/plain',
    },
    body: iso,
  })
  if (!res.ok) throw new Error(`KV set metrics sync failed: ${res.status} ${await res.text()}`)
}

export async function getMetricsLastSynced(platform: string): Promise<string | null> {
  if (!canUseKv()) return null
  const res = await fetch(`${kvBaseUrl()}/${encodeURIComponent(key(platform))}`, {
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`KV get metrics sync failed: ${res.status} ${await res.text()}`)
  const text = (await res.text()).trim()
  return text || null
}

