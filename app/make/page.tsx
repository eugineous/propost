'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformConfig {
  id: string
  name: string
  icon: string
  color: string
  envVar: string
  makeApp: string
  makeAction: string
  fieldMap: Array<{ makeField: string; propostField: string; note?: string }>
}

interface MakeStatus {
  configured: boolean
  envVar: string
}

// ─── Platform definitions ─────────────────────────────────────────────────────

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'facebook',
    name: 'Facebook Pages',
    icon: '📘',
    color: '#1877f2',
    envVar: 'MAKE_WEBHOOK_FACEBOOK',
    makeApp: 'Facebook Pages',
    makeAction: 'Create a Post',
    fieldMap: [
      { makeField: 'Post caption', propostField: 'content', note: 'The full post text' },
      { makeField: 'Link URL', propostField: 'media_url', note: 'Leave empty for text posts' },
    ],
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    icon: '𝕏',
    color: '#1d9bf0',
    envVar: 'MAKE_WEBHOOK_X',
    makeApp: 'X (Twitter)',
    makeAction: 'Create a Tweet',
    fieldMap: [
      { makeField: 'Tweet text', propostField: 'content', note: 'Under 280 chars — ProPost handles this' },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: '#e1306c',
    envVar: 'MAKE_WEBHOOK_INSTAGRAM',
    makeApp: 'Instagram for Business',
    makeAction: 'Create a Photo Post',
    fieldMap: [
      { makeField: 'Caption', propostField: 'content', note: 'Caption with hashtags' },
      { makeField: 'Image URL', propostField: 'media_url', note: 'Required for Instagram — set DEFAULT_IG_IMAGE_URL in Vercel' },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: '#0a66c2',
    envVar: 'MAKE_WEBHOOK_LINKEDIN',
    makeApp: 'LinkedIn',
    makeAction: 'Create a Post',
    fieldMap: [
      { makeField: 'Commentary / Text', propostField: 'content', note: 'The full post text' },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: '#ff0050',
    envVar: 'MAKE_WEBHOOK_TIKTOK',
    makeApp: 'TikTok',
    makeAction: 'Upload a Video',
    fieldMap: [
      { makeField: 'Caption', propostField: 'content', note: 'Video caption' },
      { makeField: 'Video URL', propostField: 'media_url', note: 'URL of the video file' },
    ],
  },
]

// ─── Sample payload ProPost sends ─────────────────────────────────────────────

const SAMPLE_PAYLOAD = {
  platform: 'facebook',
  content: 'AI is reshaping how Nairobi creates. From automated video editing to AI-generated scripts — the shift is happening right now. What does this mean for Kenyan creators? #AIKenya #NairobiTech',
  media_url: null,
  title: null,
  pillar: 'ai_news',
  agent: 'CHIEF',
  timestamp: new Date().toISOString(),
  source: 'propost_empire',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MakeSetupPage() {
  const [status, setStatus] = useState<Record<string, MakeStatus>>({})
  const [webhookUrls, setWebhookUrls] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({})
  const [saveResults, setSaveResults] = useState<Record<string, { ok: boolean; message: string }>>({})

  useEffect(() => {
    fetch('/api/make/status')
      .then(r => r.json())
      .then((d: { platforms: Record<string, MakeStatus> }) => {
        setStatus(d.platforms ?? {})
      })
      .catch(() => {})
  }, [])

  const saveWebhook = async (platformId: string, envVar: string) => {
    const url = webhookUrls[platformId]?.trim()
    if (!url) return
    setSaving(platformId)
    try {
      const res = await fetch('/api/make/save-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId, webhookUrl: url, envVar }),
      })
      const data = await res.json() as { ok: boolean; message?: string; error?: string }
      setSaveResults(prev => ({
        ...prev,
        [platformId]: { ok: data.ok, message: data.ok ? '✅ Saved — redeploy Vercel to activate' : `❌ ${data.error ?? 'Failed'}` },
      }))
      if (data.ok) {
        setStatus(prev => ({ ...prev, [platformId]: { ...prev[platformId], configured: true, envVar } }))
      }
    } catch (err) {
      setSaveResults(prev => ({ ...prev, [platformId]: { ok: false, message: `❌ ${String(err)}` } }))
    } finally {
      setSaving(null)
    }
  }

  const testWebhook = async (platformId: string) => {
    setTesting(platformId)
    setTestResults(prev => ({ ...prev, [platformId]: { ok: false, message: '⏳ Sending test...' } }))
    try {
      const res = await fetch('/api/make/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId }),
      })
      const data = await res.json() as { ok: boolean; error?: string }
      setTestResults(prev => ({
        ...prev,
        [platformId]: {
          ok: data.ok,
          message: data.ok
            ? '✅ Test sent — check Make.com scenario history'
            : `❌ ${data.error ?? 'Webhook not configured'}`,
        },
      }))
    } catch (err) {
      setTestResults(prev => ({ ...prev, [platformId]: { ok: false, message: `❌ ${String(err)}` } }))
    } finally {
      setTesting(null)
    }
  }

  const configuredCount = PLATFORMS.filter(p => status[p.id]?.configured).length

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Empire</Link>
        <span className="text-white font-bold">Make.com Setup</span>
        <span className="text-xs text-gray-600">Connect your social accounts via Make</span>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded ${configuredCount === PLATFORMS.length ? 'text-green-400 bg-green-900/30' : 'text-yellow-400 bg-yellow-900/30'}`}>
          {configuredCount}/{PLATFORMS.length} configured
        </span>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* How it works */}
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-4 text-sm text-blue-300 leading-relaxed">
          <div className="font-bold text-blue-200 mb-2">How this works</div>
          <div>ProPost generates content → sends it to your Make.com webhook → Make posts it using your logged-in social accounts. You connect your accounts once in Make — no API keys needed.</div>
          <div className="mt-2 text-blue-400 font-mono text-xs">ProPost → Make webhook → Your Facebook/Instagram/LinkedIn/X/TikTok</div>
        </div>

        {/* Payload reference */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-yellow-400 font-bold tracking-wider mb-3">EXACT JSON PROPOST SENDS TO MAKE</div>
          <pre className="text-xs text-green-400 font-mono bg-gray-950 rounded p-3 overflow-x-auto">
            {JSON.stringify(SAMPLE_PAYLOAD, null, 2)}
          </pre>
          <div className="mt-3 text-xs text-gray-500">
            In Make, when mapping fields: use <span className="text-white font-mono">content</span> for the post text, <span className="text-white font-mono">media_url</span> for images/videos.
          </div>
        </div>

        {/* Platform cards */}
        {PLATFORMS.map(platform => {
          const isConfigured = status[platform.id]?.configured
          const isSaving = saving === platform.id
          const isTesting = testing === platform.id
          const testResult = testResults[platform.id]
          const saveResult = saveResults[platform.id]

          return (
            <div
              key={platform.id}
              className="bg-gray-900 border rounded-lg p-5"
              style={{ borderColor: isConfigured ? platform.color + '55' : '#1f2937' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: platform.color + '22', color: platform.color }}>
                    {platform.icon}
                  </div>
                  <div>
                    <div className="font-bold text-gray-100">{platform.name}</div>
                    <div className="text-xs text-gray-500">{platform.makeApp} → {platform.makeAction}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConfigured
                    ? <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded font-bold">✓ Configured</span>
                    : <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Not configured</span>
                  }
                </div>
              </div>

              {/* Make setup instructions */}
              <div className="bg-gray-800/50 rounded p-3 mb-4 text-xs text-gray-400 space-y-1">
                <div className="text-gray-300 font-bold mb-2">In Make.com — create this scenario:</div>
                <div>1. Add trigger: <span className="text-white">Webhooks → Custom webhook</span> → click Add → name it <span className="text-white">ProPost {platform.name}</span> → Save → copy the URL</div>
                <div>2. Add action: <span className="text-white">{platform.makeApp} → {platform.makeAction}</span> → connect your account</div>
                <div>3. Map these fields:</div>
                <div className="ml-4 space-y-1 mt-1">
                  {platform.fieldMap.map(f => (
                    <div key={f.makeField} className="flex items-start gap-2">
                      <span className="text-yellow-400 font-mono">{f.makeField}</span>
                      <span className="text-gray-600">→</span>
                      <span className="text-green-400 font-mono">{`{{1.${f.propostField}}}`}</span>
                      {f.note && <span className="text-gray-600">({f.note})</span>}
                    </div>
                  ))}
                </div>
                <div>4. Turn scenario <span className="text-white">ON</span> → set to <span className="text-white">Every 15 minutes</span></div>
              </div>

              {/* Webhook URL input */}
              <div className="flex gap-2 mb-2">
                <input
                  type="url"
                  placeholder={`Paste your Make webhook URL for ${platform.name}...`}
                  value={webhookUrls[platform.id] ?? ''}
                  onChange={e => setWebhookUrls(prev => ({ ...prev, [platform.id]: e.target.value }))}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  onClick={() => saveWebhook(platform.id, platform.envVar)}
                  disabled={isSaving || !webhookUrls[platform.id]?.trim()}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 rounded text-xs font-bold transition-colors whitespace-nowrap"
                >
                  {isSaving ? '⏳' : 'Save'}
                </button>
                <button
                  onClick={() => testWebhook(platform.id)}
                  disabled={isTesting || !isConfigured}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded text-xs font-bold transition-colors whitespace-nowrap"
                  title={!isConfigured ? 'Save webhook URL first' : 'Send a test post'}
                >
                  {isTesting ? '⏳' : '🧪 Test'}
                </button>
              </div>

              {/* Env var name */}
              <div className="text-xs text-gray-600 mb-2">
                Vercel env var: <span className="font-mono text-gray-400">{platform.envVar}</span>
              </div>

              {/* Results */}
              {saveResult && (
                <div className={`text-xs p-2 rounded mt-1 ${saveResult.ok ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
                  {saveResult.message}
                </div>
              )}
              {testResult && (
                <div className={`text-xs p-2 rounded mt-1 ${testResult.ok ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
                  {testResult.message}
                </div>
              )}
            </div>
          )
        })}

        {/* After setup */}
        {configuredCount > 0 && (
          <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-4 text-sm text-green-300">
            <div className="font-bold text-green-200 mb-1">✅ {configuredCount} platform{configuredCount > 1 ? 's' : ''} configured</div>
            <div>ProPost will now route posts through Make.com for these platforms. Go to <Link href="/" className="text-green-400 underline">Empire HQ</Link> and hit "Post Now" to test the full chain.</div>
          </div>
        )}
      </div>
    </div>
  )
}
