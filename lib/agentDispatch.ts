// Static agent dispatch map — avoids dynamic import() which breaks Next.js build
// IntelCore
import { run as sovereign } from '@/agents/intelcore/sovereign'
import { run as oracle } from '@/agents/intelcore/oracle'
import { run as memory } from '@/agents/intelcore/memory'
import { run as sentry } from '@/agents/intelcore/sentry'
import { run as scribe } from '@/agents/intelcore/scribe'
// XForce
import { run as zara } from '@/agents/xforce/zara'
import { run as blaze } from '@/agents/xforce/blaze'
import { run as scout } from '@/agents/xforce/scout'
import { run as echo } from '@/agents/xforce/echo'
import { run as hawk } from '@/agents/xforce/hawk'
import { run as lumen } from '@/agents/xforce/lumen'
import { run as pixel_x } from '@/agents/xforce/pixel_x'
import { run as thunder } from '@/agents/xforce/thunder'
import { run as surge } from '@/agents/xforce/surge'
import { run as flint } from '@/agents/xforce/flint'
import { run as nova_x } from '@/agents/xforce/nova_x'
import { run as forge } from '@/agents/xforce/forge'
import { run as trace } from '@/agents/xforce/trace'
// LinkedElite
import { run as nova } from '@/agents/linkedelite/nova'
import { run as orator } from '@/agents/linkedelite/orator'
import { run as bridge } from '@/agents/linkedelite/bridge'
import { run as atlas } from '@/agents/linkedelite/atlas'
import { run as deal_li } from '@/agents/linkedelite/deal'
import { run as graph } from '@/agents/linkedelite/graph'
import { run as voice } from '@/agents/linkedelite/voice'
import { run as prism } from '@/agents/linkedelite/prism'
import { run as mentor } from '@/agents/linkedelite/mentor'
import { run as amplify } from '@/agents/linkedelite/amplify'
// GramGod
import { run as aurora } from '@/agents/gramgod/aurora'
import { run as vibe } from '@/agents/gramgod/vibe'
import { run as chat } from '@/agents/gramgod/chat'
import { run as deal_ig } from '@/agents/gramgod/deal'
import { run as lens } from '@/agents/gramgod/lens'
import { run as reel } from '@/agents/gramgod/reel'
import { run as story } from '@/agents/gramgod/story'
import { run as caption } from '@/agents/gramgod/caption'
import { run as hashtag } from '@/agents/gramgod/hashtag'
import { run as tribe } from '@/agents/gramgod/tribe'
import { run as fanbase } from '@/agents/gramgod/fanbase'
import { run as rescue } from '@/agents/gramgod/rescue'
// PagePower
import { run as chief } from '@/agents/pagepower/chief'
import { run as pulse } from '@/agents/pagepower/pulse'
import { run as community } from '@/agents/pagepower/community'
import { run as reach } from '@/agents/pagepower/reach'
// WebBoss
import { run as root } from '@/agents/webboss/root'
import { run as crawl } from '@/agents/webboss/crawl'
import { run as build } from '@/agents/webboss/build'
import { run as shield } from '@/agents/webboss/shield'
import { run as speed } from '@/agents/webboss/speed'
// HRForce
import { run as people } from '@/agents/hrforce/people'
import { run as welfare } from '@/agents/hrforce/welfare'
import { run as rotate } from '@/agents/hrforce/rotate'
import { run as discipline } from '@/agents/hrforce/discipline'
import { run as reward } from '@/agents/hrforce/reward'
import { run as brief } from '@/agents/hrforce/brief'
import { run as onboard } from '@/agents/hrforce/onboard'
import { run as culture } from '@/agents/hrforce/culture'
import { run as train } from '@/agents/hrforce/train'
import { run as eval_ } from '@/agents/hrforce/eval'
import { run as social } from '@/agents/hrforce/social'
import { run as advocate } from '@/agents/hrforce/advocate'
// LegalShield
import { run as judge } from '@/agents/legalshield/judge'
import { run as policy } from '@/agents/legalshield/policy'
import { run as risk } from '@/agents/legalshield/risk'
import { run as copyright } from '@/agents/legalshield/copyright'
import { run as gdpr } from '@/agents/legalshield/gdpr'
import { run as defame } from '@/agents/legalshield/defame'
import { run as shadow } from '@/agents/legalshield/shadow'
import { run as appeal } from '@/agents/legalshield/appeal'
import { run as counsel } from '@/agents/legalshield/counsel'
// FinanceDesk
import { run as banker } from '@/agents/financedesk/banker'
import { run as deal_fd } from '@/agents/financedesk/deal'
import { run as rate } from '@/agents/financedesk/rate'
import { run as invoice } from '@/agents/financedesk/invoice'
import { run as sponsor } from '@/agents/financedesk/sponsor'
import { run as revenue } from '@/agents/financedesk/revenue'
import { run as pitch } from '@/agents/financedesk/pitch'
import { run as collab } from '@/agents/financedesk/collab'
import { run as grants } from '@/agents/financedesk/grants'
import { run as forecast } from '@/agents/financedesk/forecast'
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
  'xforce/thunder': thunder,
  'xforce/surge': surge,
  'xforce/flint': flint,
  'xforce/nova_x': nova_x,
  'xforce/forge': forge,
  'xforce/trace': trace,
  // LinkedElite
  'linkedelite/nova': nova,
  'linkedelite/orator': orator,
  'linkedelite/bridge': bridge,
  'linkedelite/atlas': atlas,
  'linkedelite/deal': deal_li,
  'linkedelite/deal_li': deal_li,
  'linkedelite/graph': graph,
  'linkedelite/voice': voice,
  'linkedelite/prism': prism,
  'linkedelite/mentor': mentor,
  'linkedelite/amplify': amplify,
  // GramGod
  'gramgod/aurora': aurora,
  'gramgod/vibe': vibe,
  'gramgod/chat': chat,
  'gramgod/deal': deal_ig,
  'gramgod/deal_ig': deal_ig,
  'gramgod/lens': lens,
  'gramgod/reel': reel,
  'gramgod/story': story,
  'gramgod/caption': caption,
  'gramgod/hashtag': hashtag,
  'gramgod/tribe': tribe,
  'gramgod/fanbase': fanbase,
  'gramgod/rescue': rescue,
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
  // HRForce
  'hrforce/people': people,
  'hrforce/welfare': welfare,
  'hrforce/rotate': rotate,
  'hrforce/discipline': discipline,
  'hrforce/reward': reward,
  'hrforce/brief': brief,
  'hrforce/onboard': onboard,
  'hrforce/culture': culture,
  'hrforce/train': train,
  'hrforce/eval': eval_,
  'hrforce/social': social,
  'hrforce/advocate': advocate,
  // LegalShield
  'legalshield/judge': judge,
  'legalshield/policy': policy,
  'legalshield/risk': risk,
  'legalshield/copyright': copyright,
  'legalshield/gdpr': gdpr,
  'legalshield/defame': defame,
  'legalshield/shadow': shadow,
  'legalshield/appeal': appeal,
  'legalshield/counsel': counsel,
  // FinanceDesk
  'financedesk/banker': banker,
  'financedesk/deal': deal_fd,
  'financedesk/deal_fd': deal_fd,
  'financedesk/rate': rate,
  'financedesk/invoice': invoice,
  'financedesk/sponsor': sponsor,
  'financedesk/revenue': revenue,
  'financedesk/pitch': pitch,
  'financedesk/collab': collab,
  'financedesk/collab_fd': collab,
  'financedesk/grants': grants,
  'financedesk/forecast': forecast,
  'financedesk/forecast_fd': forecast,
}

// Lookup: agent name -> corp (for the work route generic dispatch)
export const AGENT_CORP_LOOKUP: Record<string, string> = {
  sovereign: 'intelcore', oracle: 'intelcore', memory: 'intelcore', sentry: 'intelcore', scribe: 'intelcore',
  zara: 'xforce', blaze: 'xforce', scout: 'xforce', echo: 'xforce', hawk: 'xforce', lumen: 'xforce',
  pixel_x: 'xforce', thunder: 'xforce', surge: 'xforce', flint: 'xforce', nova_x: 'xforce', forge: 'xforce', trace: 'xforce',
  nova: 'linkedelite', orator: 'linkedelite', bridge: 'linkedelite', atlas: 'linkedelite',
  deal_li: 'linkedelite', graph: 'linkedelite', voice: 'linkedelite', prism: 'linkedelite', mentor: 'linkedelite', amplify: 'linkedelite',
  aurora: 'gramgod', vibe: 'gramgod', chat: 'gramgod', deal_ig: 'gramgod', lens: 'gramgod',
  reel: 'gramgod', story: 'gramgod', caption: 'gramgod', hashtag: 'gramgod', tribe: 'gramgod', fanbase: 'gramgod', rescue: 'gramgod',
  chief: 'pagepower', pulse: 'pagepower', community: 'pagepower', reach: 'pagepower',
  root: 'webboss', crawl: 'webboss', build: 'webboss', shield: 'webboss', speed: 'webboss',
  people: 'hrforce', welfare: 'hrforce', rotate: 'hrforce', discipline: 'hrforce', reward: 'hrforce',
  brief: 'hrforce', onboard: 'hrforce', culture: 'hrforce', train: 'hrforce', eval: 'hrforce', social: 'hrforce', advocate: 'hrforce',
  judge: 'legalshield', policy: 'legalshield', risk: 'legalshield', copyright: 'legalshield', gdpr: 'legalshield',
  defame: 'legalshield', shadow: 'legalshield', appeal: 'legalshield', counsel: 'legalshield',
  banker: 'financedesk', deal: 'financedesk', rate: 'financedesk', invoice: 'financedesk', sponsor: 'financedesk',
  revenue: 'financedesk', pitch: 'financedesk', collab: 'financedesk', grants: 'financedesk', forecast: 'financedesk',
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
