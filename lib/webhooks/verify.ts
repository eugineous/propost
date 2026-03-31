// Webhook HMAC verification — Web Crypto API only (Cloudflare Worker compatible)
// X: HMAC-SHA256, base64-encoded signature
// Instagram/Facebook: HMAC-SHA256, hex-encoded with 'sha256=' prefix

export async function verifyWebhook(
  platform: 'x' | 'instagram' | 'facebook',
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody))

  if (platform === 'x') {
    // X uses base64-encoded signature
    const expected = btoa(Array.from(new Uint8Array(sig)).map((b) => String.fromCharCode(b)).join(''))
    return signature === expected || signature === `sha256=${expected}`
  }

  // Instagram/Facebook use hex-encoded with 'sha256=' prefix
  const hexSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const expected = `sha256=${hexSig}`
  return signature === expected
}
