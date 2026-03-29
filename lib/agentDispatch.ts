// Static agent dispatch map — avoids dynamic import() which breaks Next.js build
import { run as sovereign } from '@/agents/intelcore/sovereign'
import { run as oracle } from '@/agents/intelcore/oracle'
import { run as memory } from '@/agents/intelcore/memory'
import { run as sentry } from '@/agents/intelcore/sentry'
import { run as scribe } from '@/agents/intelcore/scribe'
import { run as zara } from '@/agents/xforce/zara'
import { run as blaze } from '@/agents/xforce/blaze'
import { run as scout } from '@/agents/xforce/scout'
import { run as echo } from '@/agents/xforce/echo'
import { run as hawk } from '@/agents/xforce/hawk'
import { run as lumen } from '@/agents/xforce/lumen'
import { run as pixel_x } from '@/agents/xforce/pixel_x'
import { run as nova } from '@/agents/linkedelite/nova'
import { run as orator } from '@/agents/linkedelite/orator'
import { run as bridge } from '@/agents/linkedelite/bridge'
import { run as atlas } from '@/agents/linkedelite/atlas'
import { run as deal_li } from '@/agents/linkedelite/deal'
import { run as graph } from '@/agents/linkedelite/graph'
import { run as aurora } from '@/agents/gramgod/aurora'
import { run as vibe } from '@/agents/gramgod/vibe'
import { run as chat } from '@/agents/gramgod/chat'
import { run as deal_ig } from '@/agents/gramgod/deal'
import { run as lens } from '@/agents/gramgod/lens'
import { run as chief } from '@/agents/pagepower/chief'
import { run as pulse } from '@/agents/pagepower/pulse'
import { run as community } from '@/agents/pagepower/community'
import { run as reach } from '@/agents/pagepower/reach'
import { run as root } from '@/agents/webboss/root'
import { run as crawl } from '@/agents/webboss/crawl'
import { run as build } from '@/agents/webboss/build'
import { run as shield } from '@/agents/webboss/shield'
import { run as speed } from '@/agents/webboss/speed'
import type { AgentResult } from '@/lib/types'

type AgentRunFn = (task: string, data?: Record<string, unknown>) => Promise<AgentResult>

const AGENT_MAP: Record<string, AgentRunFn> = {
  // IntelCore
  'intelcore/sovereign': sovereign,
  'intelcore/oracle': oracle,
  'intelcore/memory': memory,
  'intelcore/sentry': sentry,
  'intelcore/scribe': scribe,
  // XForce
  'xforce/zara': zara,
  'xforce/blaze': blaze,
  'xforce/scout': scout,
  'xforce/echo': echo,
  'xforce/hawk': hawk,
  'xforce/lumen': lumen,
  'xforce/pixel_x': pixel_x,
  // LinkedElite
  'linkedelite/nova': nova,
  'linkedelite/orator': orator,
  'linkedelite/bridge': bridge,
  'linkedelite/atlas': atlas,
  'linkedelite/deal': deal_li,
  'linkedelite/deal_li': deal_li,
  'linkedelite/graph': graph,
  // GramGod
  'gramgod/aurora': aurora,
  'gramgod/vibe': vibe,
  'gramgod/chat': chat,
  'gramgod/deal': deal_ig,
  'gramgod/deal_ig': deal_ig,
  'gramgod/lens': lens,
  // PagePower
  'pagepower/chief': chief,
  'pagepower/pulse': pulse,
  'pagepower/community': community,
  'pagepower/reach': reach,
  // WebBoss
  'webboss/root': root,
  'webboss/crawl': crawl,
  'webboss/build': build,
  'webboss/shield': shield,
  'webboss/speed': speed,
}

export async function dispatchToAgent(
  corp: string,
  agent: string,
  parameters: Record<string, unknown>
): Promise<{ preview?: string }> {
  const key = `${corp}/${agent}`
  const runFn = AGENT_MAP[key]

  if (!runFn) {
    console.warn(`[agentDispatch] No agent found for key: ${key}`)
    return {}
  }

  try {
    const result = await runFn(
      `Execute command with parameters: ${JSON.stringify(parameters)}`,
      parameters
    )
    const raw = result.data?.response as string | undefined
    return { preview: raw?.slice(0, 200) }
  } catch (err) {
    console.error(`[agentDispatch] Error running ${key}:`, err)
    return {}
  }
}
