'use client'

// Platform Connect Page — Make.com Integration
//
// ARCHITECTURE:
// ProPost generates content → sends to Make.com webhook → Make posts to platform
// Make.com handles all OAuth/login for every platform in its own dashboard.
// You connect accounts ONCE in Make.com — no browser sessions, no cookies.
//
// SETUP PER PLATFORM:
// 1. Go to make.com → Create scenario
// 2. Add "Webhooks > Custom Webhook" as trigger
// 3. Add platform module (Instagram, Facebook, etc.) as action
// 4. Copy webhook URL → add to Vercel env vars
// 5. Done — ProPost sends content, Make posts it

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface MakePlatformStatus {
  configured: boolean
  envVar: string
}

interface MakeStatus {
  ok: boolean
  apiKey: boolean
  platforms: Record<string, MakePlatformStatus>
  summary: string
}

const PLATFORMS = [
  { id: 'x',           name: 'X (Twitter)', icon: '𝕏',  color: '#1d9bf0', group: 'Social',    makeModule: 'X (Twitter)',  caps: ['2 posts/hour', '20 replies/day'] },
  { id: 'instagram',   name: 'Instagram',   icon: '📸', color: '#e1306c', group: 'Social',    makeModule: 'Instagram',    caps: ['Daily posts', 'Stories', '20 DMs/day'] },
  { id: 'facebook',    name: 'Facebook',    icon: '📘', color: '#1877f2', group: 'Social',    makeModule: 'Facebook',     caps: ['Page posts', 'Comment replies'] },
  { id: 'linkedin',    name: 'LinkedIn',    icon: '💼', color: '#0a66c2', group: 'Social',    makeModule: 'LinkedIn',     caps: ['2 posts/hour', 'Articles'] },
  { id: 'tiktok',      name: 'TikTok',      icon: '🎵', color: '#ff0050', group: 'Video',     makeModule: 'TikTok',       caps: ['Video scripts', 'Captions'] },
  { id: 'youtube',     name: 'YouTube',     icon: '▶️', color: '#ff0000', group: 'Video',     makeModule: 'YouTube',      caps: ['Community posts', 'Descriptions'] },
  { id: 'reddit',      name: 'Reddit',      icon: '🤖', color: '#ff4500', group: 'Community', makeModule: 'Reddit',       caps: ['3-5 posts/day', '20 comments/day'] },
  { id: 'mastodon',    name: 'Mastodon',    icon: '🐘', color: '#6364ff', group: 'Community', makeModule: 'HTTP (custom)',caps: ['Posts every 2-3 hours'] },
  { id: 'truthsocial', name: 'Truth Social', icon: '🇺🇸', color: '#5448ee', group: 'Community', makeModule: 'HTTP (custom)',caps: ['Posts', 'Replies'] },
]

const GROUPS = ['Social', 'Video', 'Community']

export default function ConnectPage() {
  const [makeStatus, setMakeStatus] = useState<MakeStatus | null>(null)
  const [testResults, setTestResults] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/make/status')
      const data = await res.json()
      setMakeStatus(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadStatus()
    const t = setInterval(loadStatus, 10000)
    return () => clearInterval(t)
  }, [loadStatus])

  const testWebhook = useCallback(async (platformId: string) => {
    setTesting(platformId)
    setTestResults(prev => ({ ...prev, [platformId]: '⏳ Testing...' }))
    try {
      const res = await fetch('/api/make/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platformId,
          content: `🧪 ProPost test post from ${platformId.toUpperCase()} — ${new Date().toLocaleTimeString()}. If you see this, the Make.com integration is working!`,
          pillar: 'ai_news',
          agentName: 'TEST',
        }),
      })
      const data = await res.json() as { ok: boolean; results?: Array<{ ok: boolean; error?: string }> }
      const result = data.results?.[0]
      if (result?.ok) {
        setTestResults(prev => ({ ...prev, [platformId]: '✅ Test post sent via Make.com!' }))
      } else {
        setTestResults(prev => ({ ...prev, [platformId]: `❌ ${result?.error ?? 'Failed'}` }))
      }
    } catch (err) {
      setTestResults(prev => ({ ...prev, [platformId]: `❌ ${String(err)}` }))
    } finally {
      setTesting(null)
    }
  }, [])

  const selectedPlatform = PLATFORMS.find(p => p.id === selected)
  const selectedStatus = makeStatus?.platforms[selected ?? '']

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Empire</Link>
        <span className="text-white font-bold">Connect Platforms</span>
        <span className="text-xs text-gray-600">via Make.com — connect once, post everywhere</span>
      </div>

      {/* Make.com explanation banner */}
      <div className="mx-6 mt-4 p-4 bg-purple-900/20 border border-purple-800/40 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚡</div>
          <div>
            <div className="font-bold text-purple-200 mb-1">Powered by Make.com</div>
            <div className="text-xs text-purple-300 leading-relaxed">
              Make.com handles all platform logins and OAuth — no browser sessions, no cookies, no Chrome issues.
              You connect your accounts once inside Make's dashboard, then ProPost sends content via webhook and Make posts it.
              <strong className="text-white"> API key: e9473f61-9d7f-4e85-b6c0-da2cdca95a7e</strong>
            </div>
            <div className="mt-2 flex gap-2">
              <a href="https://www.make.com/en/login" target="_blank" rel="noreferrer"
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 rounded text-xs font-bold">
                Open Make.com Dashboard →
              </a>
              {makeStatus && (
                <span className="px-3 py-1.5 bg-gray-800 rounded text-xs text-gray-400">
                  {makeStatus.summary}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-12 gap-6">
        {/* Left: platform list */}
        <div className="col-span-4 space-y-5">
          {GROUPS.map(group => (
            <div key={group}>
              <div className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-2">{group}</div>
              <div className="space-y-1.5">
                {PLATFORMS.filter(p => p.group === group).map(platform => {
                  const status = makeStatus?.platforms[platform.id]
                  const isConfigured = status?.configured ?? false
                  const isSelected = selected === platform.id

                  return (
                    <button
                      key={platform.id}
                      onClick={() => setSelected(platform.id)}
                      className="w-full text-left bg-gray-900 border rounded-lg p-3 transition-all hover:bg-gray-800"
                      style={{ borderColor: isSelected ? platform.color : isConfigured ? platform.color + '44' : '#1f2937' }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded flex items-center justify-center text-sm flex-shrink-0 font-bold"
                          style={{ backgroundColor: platform.color + '22', color: platform.color }}>
                          {platform.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-100">{platform.name}</span>
                            {isConfigured
                              ? <span className="text-xs text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded font-bold">✓ Ready</span>
                              : <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">Setup needed</span>
                            }
                          </div>
                          <div className="text-xs text-gray-600 truncate">{platform.caps.join(' · ')}</div>
                        </div>
                      </div>
                      {testResults[platform.id] && (
                        <div className={`mt-1.5 text-xs rounded p-1 ${
                          testResults[platform.id].startsWith('✅') ? 'text-green-400 bg-green-900/20' :
                          testResults[platform.id].startsWith('❌') ? 'text-red-400 bg-red-900/20' :
                          'text-yellow-400 bg-yellow-900/20'
                        }`}>
                          {testResults[platform.id]}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right: setup instructions */}
        <div className="col-span-8">
          {!selected ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">⚡</div>
              <div className="text-gray-300 font-bold mb-2">Select a platform to set up</div>
              <div className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed mb-6">
                Click any platform on the left to see step-by-step setup instructions for Make.com.
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-left max-w-md mx-auto">
                <div className="text-xs text-gray-400 font-bold mb-2">QUICK OVERVIEW</div>
                <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside">
                  <li>Go to <a href="https://make.com" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">make.com</a> and log in</li>
                  <li>Create a new Scenario for each platform</li>
                  <li>Add Webhook trigger → Platform post action</li>
                  <li>Copy the webhook URL</li>
                  <li>Add it to Vercel env vars</li>
                  <li>Test it here — done!</li>
                </ol>
              </div>
            </div>
          ) : selectedPlatform ? (
            <div className="bg-gray-900 border rounded-lg overflow-hidden"
              style={{ borderColor: selectedPlatform.color + '55' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <span style={{ color: selectedPlatform.color }}>{selectedPlatform.icon}</span>
                  <span className="font-bold text-gray-200">{selectedPlatform.name} Setup</span>
                  {selectedStatus?.configured
                    ? <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded">✓ Configured</span>
                    : <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded">⚠ Not configured</span>
                  }
                </div>
                {selectedStatus?.configured && (
                  <button
                    onClick={() => testWebhook(selectedPlatform.id)}
                    disabled={testing === selectedPlatform.id}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 rounded text-xs font-bold"
                  >
                    {testing === selectedPlatform.id ? '⏳ Testing...' : '🧪 Send Test Post'}
                  </button>
                )}
              </div>

              {/* Instructions */}
              <div className="p-5 space-y-4">
                {/* Step 1 */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-xs font-bold text-gray-300 mb-2">STEP 1 — Create a Make.com Scenario</div>
                  <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
                    <li>Go to <a href="https://www.make.com/en/login" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">make.com</a> → log in with your account</li>
                    <li>Click <strong className="text-gray-200">Create a new scenario</strong></li>
                    <li>Search for <strong className="text-gray-200">Webhooks</strong> → select <strong className="text-gray-200">Custom Webhook</strong></li>
                    <li>Click <strong className="text-gray-200">Add</strong> → give it a name like <code className="bg-gray-700 px-1 rounded">ProPost {selectedPlatform.name}</code></li>
                    <li>Copy the webhook URL that appears</li>
                  </ol>
                </div>

                {/* Step 2 */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-xs font-bold text-gray-300 mb-2">STEP 2 — Add {selectedPlatform.name} Action</div>
                  <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
                    <li>Click the <strong className="text-gray-200">+</strong> button after the webhook</li>
                    <li>Search for <strong className="text-gray-200">{selectedPlatform.makeModule}</strong></li>
                    <li>Select <strong className="text-gray-200">Create a Post</strong> (or equivalent action)</li>
                    <li>Connect your {selectedPlatform.name} account when prompted — Make handles the OAuth</li>
                    <li>Map the <code className="bg-gray-700 px-1 rounded">content</code> field from the webhook to the post text</li>
                    <li>Save and <strong className="text-gray-200">turn the scenario ON</strong></li>
                  </ol>
                </div>

                {/* Step 3 */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-xs font-bold text-gray-300 mb-2">STEP 3 — Add Webhook URL to Vercel</div>
                  <div className="text-xs text-gray-400 mb-2">
                    Add this environment variable to your Vercel project:
                  </div>
                  <div className="bg-gray-900 rounded p-3 font-mono text-xs">
                    <div className="text-yellow-400">{selectedStatus?.envVar}</div>
                    <div className="text-gray-500 mt-1">= https://hook.eu1.make.com/your-webhook-id-here</div>
                  </div>
                  <a
                    href="https://vercel.com/roylandz-media/propost/settings/environment-variables"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-blue-400 hover:underline"
                  >
                    Open Vercel Environment Variables →
                  </a>
                </div>

                {/* Step 4 */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-xs font-bold text-gray-300 mb-2">STEP 4 — Test It</div>
                  <div className="text-xs text-gray-400 mb-3">
                    After adding the env var and redeploying, click the test button above.
                    ProPost will send a test post through Make to {selectedPlatform.name}.
                  </div>
                  {!selectedStatus?.configured && (
                    <div className="text-xs text-yellow-400 bg-yellow-900/20 rounded p-2">
                      ⚠ <strong>{selectedStatus?.envVar}</strong> is not set yet. Add it to Vercel first.
                    </div>
                  )}
                  {selectedStatus?.configured && (
                    <div className="text-xs text-green-400 bg-green-900/20 rounded p-2">
                      ✓ Webhook URL is configured. Click "Send Test Post" to verify it works end-to-end.
                    </div>
                  )}
                </div>

                {/* What ProPost sends */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-xs font-bold text-gray-300 mb-2">WHAT PROPOST SENDS TO MAKE</div>
                  <pre className="text-xs text-gray-400 bg-gray-900 rounded p-3 overflow-x-auto">{JSON.stringify({
                    platform: selectedPlatform.id,
                    content: "Your AI-generated post content here...",
                    media_url: null,
                    pillar: "ai_news",
                    agent: "BLAZE",
                    timestamp: new Date().toISOString(),
                    source: "propost_empire"
                  }, null, 2)}</pre>
                  <div className="text-xs text-gray-600 mt-2">
                    Map <code className="bg-gray-700 px-1 rounded">content</code> to the post text field in Make.
                    Use <code className="bg-gray-700 px-1 rounded">media_url</code> for image/video if present.
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
