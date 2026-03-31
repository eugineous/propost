// Agent Registry — exports all agent instances
// Used for heartbeat initialization, status queries, and direct dispatch

import type { BaseAgent } from './base'

// Tier 1 — SOVEREIGN
import { sovereign } from './sovereign'

// Tier 2 — CEO Agents
import { zara } from './ceo/zara'
import { nova } from './ceo/nova'
import { aurora } from './ceo/aurora'
import { chief } from './ceo/chief'
import { root } from './ceo/root'
import { oracle } from './ceo/oracle'

// Tier 3 — XForce
import { blaze } from './xforce/post-executor'
import { echo } from './xforce/reply-specialist'
import { scout } from './xforce/trend-analyst'

// Tier 3 — LinkedElite
import { orator } from './linkedelite/content-creator'
import { bridge } from './linkedelite/networking-agent'

// Tier 3 — GramGod
import { caption } from './gramgod/caption-agent'
import { reel } from './gramgod/reel-agent'
import { story } from './gramgod/story-agent'
import { chat } from './gramgod/dm-handler'

// Tier 3 — PagePower
import { reach } from './pagepower/content-creator'
import { community } from './pagepower/community-agent'
import { pulse } from './pagepower/analytics-agent'

// Tier 3 — WebBoss
import { build } from './webboss/build-agent'
import { crawl } from './webboss/seo-agent'
import { speed } from './webboss/speed-agent'
import { shield } from './webboss/shield-agent'

// Tier 3 — IntelCore
import { sentry } from './intelcore/trend-analyst'
import { memory } from './intelcore/memory-agent'
import { risk } from './intelcore/risk-analyzer'

// Tier 4 — Control Agents
import { qcAgent } from './control/qc-agent'
import { toneValidator } from './control/tone-validator'
import { approvalGate } from './control/approval-gate'

export const agentRegistry: Record<string, BaseAgent> = {
  // Tier 1
  SOVEREIGN: sovereign,

  // Tier 2 — CEOs
  ZARA: zara,
  NOVA: nova,
  AURORA: aurora,
  CHIEF: chief,
  ROOT: root,
  ORACLE: oracle,

  // Tier 3 — XForce
  BLAZE: blaze,
  ECHO: echo,
  SCOUT: scout,

  // Tier 3 — LinkedElite
  ORATOR: orator,
  BRIDGE: bridge,

  // Tier 3 — GramGod
  CAPTION: caption,
  REEL: reel,
  STORY: story,
  CHAT: chat,

  // Tier 3 — PagePower
  REACH: reach,
  COMMUNITY: community,
  PULSE: pulse,

  // Tier 3 — WebBoss
  BUILD: build,
  CRAWL: crawl,
  SPEED: speed,
  SHIELD: shield,

  // Tier 3 — IntelCore
  SENTRY: sentry,
  MEMORY: memory,
  RISK: risk,

  // Tier 4 — Control
  QC_AGENT: qcAgent,
  TONE_VALIDATOR: toneValidator,
  APPROVAL_GATE: approvalGate,
}

// Re-export individual instances for direct import
export {
  sovereign,
  zara, nova, aurora, chief, root, oracle,
  blaze, echo, scout,
  orator, bridge,
  caption, reel, story, chat,
  reach, community, pulse,
  build, crawl, speed, shield,
  sentry, memory, risk,
  qcAgent, toneValidator, approvalGate,
}
