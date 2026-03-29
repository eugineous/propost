'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Deal {
  id: string
  brandName: string
  platform: string
  estimatedValue: number
  contact: string
  stage: string
  notes: string
  createdAt: string | null
  agentName: string
}

type Stage = 'incoming' | 'screening' | 'negotiating' | 'agreed' | 'closed'

const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: 'incoming', label: '📥 INCOMING', color: '#64748B' },
  { key: 'screening', label: '🔍 SCREENING', color: '#3B82F6' },
  { key: 'negotiating', label: '🤝 NEGOTIATING', color: '#F59E0B' },
  { key: 'agreed', label: '✅ AGREED', color: '#22C55E' },
  { key: 'closed', label: '💰 CLOSED', color: '#FFD700' },
]

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  x: '#1DA1F2',
  linkedin: '#0077B5',
  youtube: '#FF0000',
  tiktok: '#00F2EA',
}

const RATE_CARD = [
  { deliverable: 'Instagram Story (1 slide)', rate: 'KES 50,000' },
  { deliverable: 'Instagram Reel (60s)', rate: 'KES 120,000' },
  { deliverable: 'Instagram Feed Post', rate: 'KES 80,000' },
  { deliverable: 'Facebook Post + Boost', rate: 'KES 60,000' },
  { deliverable: 'X/Twitter Thread', rate: 'KES 40,000' },
  { deliverable: 'LinkedIn Article', rate: 'KES 70,000' },
  { deliverable: 'Full Campaign (30 days)', rate: 'KES 500,000' },
]

function NewDealModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    brandName: '',
    platform: 'instagram',
    estimatedValue: '',
    contact: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.brandName.trim()) return
    setSaving(true)
    try {
      await fetch('/api/brand-deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: form.brandName,
          platform: form.platform,
          estimatedValue: Number(form.estimatedValue) || 0,
          contact: form.contact,
          notes: form.notes,
          stage: 'incoming',
        }),
      })
      onCreated()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="pixel-card p-5 w-full max-w-md"
        style={{ background: '#12121F' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="pixel-text text-pp-gold" style={{ fontSize: 9 }}>NEW BRAND DEAL</span>
          <button onClick={onClose} className="text-pp-muted hover:text-pp-text">✕</button>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Brand Name', key: 'brandName', type: 'text', placeholder: 'e.g. Safaricom' },
            { label: 'Contact', key: 'contact', type: 'text', placeholder: 'e.g. @brand_manager' },
            { label: 'Estimated Value (KES)', key: 'estimatedValue', type: 'number', placeholder: '50000' },
            { label: 'Notes', key: 'notes', type: 'text', placeholder: 'Brief details...' },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-pp-muted block mb-1" style={{ fontSize: 8 }}>{field.label}</label>
              <input
                type={field.type}
                value={form[field.key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full p-2 rounded font-mono"
                style={{ background: '#0A0A14', border: '1px solid #1E1E3A', color: '#E2E8F0', fontSize: 10 }}
              />
            </div>
          ))}
          <div>
            <label className="text-pp-muted block mb-1" style={{ fontSize: 8 }}>Platform</label>
            <select
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              className="w-full p-2 rounded font-mono"
              style={{ background: '#0A0A14', border: '1px solid #1E1E3A', color: '#E2E8F0', fontSize: 10 }}
            >
              {['instagram', 'facebook', 'x', 'linkedin', 'youtube', 'tiktok'].map((p) => (
                <option key={p} value={p}>{p.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded pixel-text"
            style={{ fontSize: 8, background: '#1E1E3A', color: '#94A3B8' }}
          >
            CANCEL
          </button>
          <button
            onClick={save}
            disabled={saving || !form.brandName.trim()}
            className="px-3 py-1 rounded pixel-text"
            style={{ fontSize: 8, background: '#FFD700', color: '#0A0A14', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'SAVING...' : 'CREATE DEAL'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BrandDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDeal, setShowNewDeal] = useState(false)
  const [movingDeal, setMovingDeal] = useState<{ deal: Deal; stage: Stage } | null>(null)

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch('/api/brand-deals')
      const data = await res.json() as { ok: boolean; deals?: Deal[] }
      if (data.ok) setDeals(data.deals ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  const moveToStage = async (deal: Deal, newStage: Stage) => {
    setMovingDeal({ deal, stage: newStage })
    try {
      await fetch('/api/brand-deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...deal, stage: newStage, id: deal.id }),
      })
      await fetchDeals()
    } catch {
      // ignore
    } finally {
      setMovingDeal(null)
    }
  }

  // Deduplicate: keep latest record per brand+platform combo
  const deduped = deals.reduce<Record<string, Deal>>((acc, d) => {
    const key = `${d.brandName}-${d.platform}`
    if (!acc[key] || new Date(d.createdAt ?? 0) > new Date(acc[key].createdAt ?? 0)) {
      acc[key] = d
    }
    return acc
  }, {})
  const uniqueDeals = Object.values(deduped)

  const dealsByStage = (stage: Stage) => uniqueDeals.filter((d) => d.stage === stage)

  const totalRevenue = uniqueDeals
    .filter((d) => d.stage === 'agreed' || d.stage === 'closed')
    .reduce((sum, d) => sum + d.estimatedValue, 0)

  return (
    <div className="min-h-screen" style={{ background: '#0A0A14', color: '#E2E8F0' }}>
      {showNewDeal && (
        <NewDealModal
          onClose={() => setShowNewDeal(false)}
          onCreated={() => { setShowNewDeal(false); fetchDeals() }}
        />
      )}

      <nav className="flex items-center justify-between px-6 py-3 border-b border-pp-border" style={{ background: '#12121F' }}>
        <div className="flex items-center gap-6">
          <Link href="/" className="pixel-text text-pp-gold" style={{ fontSize: 10 }}>← PROPOST EMPIRE</Link>
          <span className="pixel-text text-pp-accent" style={{ fontSize: 9 }}>💰 BRAND DEALS PIPELINE</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono" style={{ fontSize: 9, color: '#FFD700' }}>
            REVENUE: KES {totalRevenue.toLocaleString()}
          </span>
          <button
            onClick={() => setShowNewDeal(true)}
            className="px-3 py-1 rounded pixel-text"
            style={{ fontSize: 8, background: '#FFD700', color: '#0A0A14' }}
          >
            + NEW DEAL
          </button>
        </div>
      </nav>

      <div className="p-4 space-y-4">
        {/* Revenue summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="pixel-card p-3">
            <div className="text-pp-muted" style={{ fontSize: 8 }}>TOTAL PIPELINE</div>
            <div className="font-mono text-pp-gold mt-1" style={{ fontSize: 12 }}>
              KES {uniqueDeals.reduce((s, d) => s + d.estimatedValue, 0).toLocaleString()}
            </div>
          </div>
          <div className="pixel-card p-3">
            <div className="text-pp-muted" style={{ fontSize: 8 }}>AGREED + CLOSED</div>
            <div className="font-mono mt-1" style={{ fontSize: 12, color: '#22C55E' }}>
              KES {totalRevenue.toLocaleString()}
            </div>
          </div>
          <div className="pixel-card p-3">
            <div className="text-pp-muted" style={{ fontSize: 8 }}>ACTIVE DEALS</div>
            <div className="font-mono mt-1" style={{ fontSize: 12, color: '#3B82F6' }}>
              {uniqueDeals.length}
            </div>
          </div>
        </div>

        {/* Kanban board */}
        {loading ? (
          <div className="grid grid-cols-5 gap-3">
            {STAGES.map((s) => (
              <div key={s.key} className="pixel-card p-3 animate-pulse" style={{ minHeight: 200 }}>
                <div className="h-3 bg-pp-border rounded w-3/4 mb-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {STAGES.map((stage) => {
              const stageDeals = dealsByStage(stage.key)
              const stageTotal = stageDeals.reduce((s, d) => s + d.estimatedValue, 0)
              return (
                <div key={stage.key} className="pixel-card p-3" style={{ minHeight: 300 }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="pixel-text" style={{ fontSize: 7, color: stage.color }}>{stage.label}</span>
                    <span className="font-mono" style={{ fontSize: 7, color: '#64748B' }}>{stageDeals.length}</span>
                  </div>
                  {stageTotal > 0 && (
                    <div className="mb-2 font-mono" style={{ fontSize: 7, color: stage.color }}>
                      KES {stageTotal.toLocaleString()}
                    </div>
                  )}
                  <div className="space-y-2">
                    {stageDeals.map((deal) => {
                      const isMoving = movingDeal?.deal.id === deal.id
                      const nextStages = STAGES.filter((s) => s.key !== stage.key)
                      return (
                        <div
                          key={deal.id}
                          className="p-2 rounded"
                          style={{
                            background: '#0A0A14',
                            border: `1px solid ${stage.color}33`,
                            opacity: isMoving ? 0.5 : 1,
                          }}
                        >
                          <div className="font-mono font-semibold" style={{ fontSize: 9, color: '#E2E8F0' }}>
                            {deal.brandName}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: PLATFORM_COLORS[deal.platform] ?? '#64748B' }}
                            />
                            <span className="font-mono" style={{ fontSize: 7, color: '#64748B' }}>
                              {deal.platform}
                            </span>
                          </div>
                          {deal.estimatedValue > 0 && (
                            <div className="font-mono mt-1" style={{ fontSize: 8, color: '#FFD700' }}>
                              KES {deal.estimatedValue.toLocaleString()}
                            </div>
                          )}
                          {deal.contact && (
                            <div className="font-mono mt-0.5" style={{ fontSize: 7, color: '#64748B' }}>
                              {deal.contact}
                            </div>
                          )}
                          {deal.notes && (
                            <div className="mt-1" style={{ fontSize: 7, color: '#94A3B8' }}>
                              {deal.notes.slice(0, 50)}
                            </div>
                          )}
                          <div className="mt-2">
                            <select
                              value={stage.key}
                              onChange={(e) => moveToStage(deal, e.target.value as Stage)}
                              disabled={isMoving}
                              className="w-full rounded font-mono"
                              style={{
                                background: '#1E1E3A',
                                border: `1px solid ${stage.color}44`,
                                color: '#94A3B8',
                                fontSize: 7,
                                padding: '2px 4px',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {nextStages.map((s) => (
                                <option key={s.key} value={s.key}>{s.label}</option>
                              ))}
                              <option value={stage.key} disabled>— MOVE TO —</option>
                            </select>
                          </div>
                        </div>
                      )
                    })}
                    {stageDeals.length === 0 && (
                      <div className="text-center text-pp-muted py-4" style={{ fontSize: 8 }}>
                        No deals
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Rate Card */}
        <div className="pixel-card p-4">
          <h3 className="pixel-text text-pp-gold mb-3" style={{ fontSize: 9 }}>💰 EUGINE&apos;S RATE CARD</h3>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {RATE_CARD.map((r) => (
              <div key={r.deliverable} className="p-2 rounded" style={{ background: '#0A0A14', border: '1px solid #1E1E3A' }}>
                <div style={{ fontSize: 8, color: '#94A3B8' }}>{r.deliverable}</div>
                <div className="font-mono mt-1" style={{ fontSize: 9, color: '#FFD700' }}>{r.rate}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
