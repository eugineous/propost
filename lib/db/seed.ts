// Seed content_pillars table with all 10 pillar definitions
// Idempotent upsert — safe to run on every deployment

import { getDb } from './client'
import { CONTENT_PILLARS } from '../content/pillars'
import { logInfo, logError } from '../logger'

export async function seedContentPillars(): Promise<void> {
  const db = getDb()
  logInfo('[Seed] Seeding content_pillars table')

  for (const pillar of CONTENT_PILLARS) {
    try {
      await db`
        INSERT INTO content_pillars (name, slug, schedule_config, active)
        VALUES (
          ${pillar.name},
          ${pillar.slug},
          ${JSON.stringify({ cron: pillar.schedule, postsPerDay: pillar.postsPerDay, platforms: pillar.platforms, tone: pillar.tone })},
          ${pillar.active}
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          schedule_config = EXCLUDED.schedule_config,
          active = EXCLUDED.active
      `
    } catch (err) {
      logError(`[Seed] Failed to seed pillar ${pillar.slug}`, { error: String(err) })
    }
  }

  logInfo('[Seed] Content pillars seeded successfully')
}

// Seed company records
export async function seedCompanies(): Promise<void> {
  const db = getDb()
  const companies = [
    { name: 'xforce', display_name: 'XForce Corp', ceo_agent: 'ZARA', platform: 'x' },
    { name: 'linkedelite', display_name: 'LinkedElite Corp', ceo_agent: 'NOVA', platform: 'linkedin' },
    { name: 'gramgod', display_name: 'GramGod Corp', ceo_agent: 'AURORA', platform: 'instagram' },
    { name: 'pagepower', display_name: 'PagePower Corp', ceo_agent: 'CHIEF', platform: 'facebook' },
    { name: 'webboss', display_name: 'WebBoss Corp', ceo_agent: 'ROOT', platform: 'website' },
    { name: 'intelcore', display_name: 'IntelCore HQ', ceo_agent: 'ORACLE', platform: null },
  ]

  for (const co of companies) {
    try {
      await db`
        INSERT INTO companies (name, display_name, ceo_agent, platform)
        VALUES (${co.name}, ${co.display_name}, ${co.ceo_agent}, ${co.platform})
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          ceo_agent = EXCLUDED.ceo_agent
      `
    } catch (err) {
      logError(`[Seed] Failed to seed company ${co.name}`, { error: String(err) })
    }
  }
}

// Seed agent records
export async function seedAgents(): Promise<void> {
  const db = getDb()
  const agents = [
    // Tier 1
    { name: 'SOVEREIGN', tier: 1, company: 'intelcore' },
    // Tier 2 — CEOs
    { name: 'ZARA', tier: 2, company: 'xforce' },
    { name: 'NOVA', tier: 2, company: 'linkedelite' },
    { name: 'AURORA', tier: 2, company: 'gramgod' },
    { name: 'CHIEF', tier: 2, company: 'pagepower' },
    { name: 'ROOT', tier: 2, company: 'webboss' },
    { name: 'ORACLE', tier: 2, company: 'intelcore' },
    // Tier 3 — XForce
    { name: 'BLAZE', tier: 3, company: 'xforce' },
    { name: 'ECHO', tier: 3, company: 'xforce' },
    { name: 'SCOUT', tier: 3, company: 'xforce' },
    // Tier 3 — LinkedElite
    { name: 'ORATOR', tier: 3, company: 'linkedelite' },
    { name: 'BRIDGE', tier: 3, company: 'linkedelite' },
    // Tier 3 — GramGod
    { name: 'CAPTION', tier: 3, company: 'gramgod' },
    { name: 'REEL', tier: 3, company: 'gramgod' },
    { name: 'STORY', tier: 3, company: 'gramgod' },
    { name: 'CHAT', tier: 3, company: 'gramgod' },
    // Tier 3 — PagePower
    { name: 'REACH', tier: 3, company: 'pagepower' },
    { name: 'COMMUNITY', tier: 3, company: 'pagepower' },
    { name: 'PULSE', tier: 3, company: 'pagepower' },
    // Tier 3 — WebBoss
    { name: 'BUILD', tier: 3, company: 'webboss' },
    { name: 'CRAWL', tier: 3, company: 'webboss' },
    { name: 'SPEED', tier: 3, company: 'webboss' },
    { name: 'SHIELD', tier: 3, company: 'webboss' },
    // Tier 3 — IntelCore
    { name: 'SENTRY', tier: 3, company: 'intelcore' },
    { name: 'MEMORY', tier: 3, company: 'intelcore' },
    { name: 'RISK', tier: 3, company: 'intelcore' },
    // Tier 4 — Control
    { name: 'QC_AGENT', tier: 4, company: 'system' },
    { name: 'TONE_VALIDATOR', tier: 4, company: 'system' },
    { name: 'APPROVAL_GATE', tier: 4, company: 'system' },
  ]

  for (const agent of agents) {
    try {
      await db`
        INSERT INTO agents (name, tier, company)
        VALUES (${agent.name}, ${agent.tier}, ${agent.company})
        ON CONFLICT (name) DO UPDATE SET
          tier = EXCLUDED.tier,
          company = EXCLUDED.company
      `
    } catch (err) {
      logError(`[Seed] Failed to seed agent ${agent.name}`, { error: String(err) })
    }
  }
}

export async function runAllSeeds(): Promise<void> {
  await seedCompanies()
  await seedAgents()
  await seedContentPillars()
}
