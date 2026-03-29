// ============================================================
// ProPost Empire — Agent Idle Behavior
// Returns what an idle agent is "doing" based on their personality
// ============================================================

const IDLE_BEHAVIORS: Record<string, string[]> = {
  // IntelCore
  sovereign: [
    'Meditating. Planning. Always planning.',
    'Reviewing empire-wide strategy in silence.',
    'Watching all 31 agents from the shadows.',
    'Drafting contingency plans for every scenario.',
  ],
  oracle: [
    'Scanning global news feeds for signals.',
    'Cross-referencing data patterns from last 30 days.',
    'Building predictive models for next week.',
    'Reading between the lines of competitor moves.',
  ],
  memory: [
    'Replaying successful campaigns in memory banks.',
    'Cataloguing lessons from the last 100 posts.',
    'Organizing knowledge graphs by topic.',
    'Archiving engagement patterns for future use.',
  ],
  sentry: [
    'Monitoring all platforms for crisis signals.',
    'Running threat assessment drills.',
    'Reviewing past crisis responses for improvements.',
    'Watching sentiment dashboards obsessively.',
  ],
  scribe: [
    'Drafting tomorrow\'s briefing outline.',
    'Reviewing agent action logs for patterns.',
    'Polishing the empire\'s narrative voice.',
    'Writing internal memos no one asked for.',
  ],

  // XForce
  zara: [
    'Studying viral X threads from the last 24 hours.',
    'Analyzing what made the top tweets pop.',
    'Drafting thread structures in her head.',
    'Scrolling X for inspiration.',
  ],
  blaze: [
    'Freestyling content ideas on whiteboard.',
    'Brainstorming hot takes about Kenyan tech.',
    'Listening to Nairobi beats for creative fuel.',
    'Writing 10 tweet hooks, deleting 9.',
  ],
  scout: [
    'Monitoring RSS feeds obsessively.',
    'Tracking Google Trends for Kenya every 5 minutes.',
    'Flagging emerging hashtags before they peak.',
    'Reading 47 news sites simultaneously.',
  ],
  echo: [
    'Analyzing reply patterns from top accounts.',
    'Drafting engagement responses for common DM types.',
    'Studying conversation flows that convert.',
    'Practicing witty comebacks.',
  ],
  hawk: [
    'Reviewing past compliance decisions.',
    'Updating internal risk scoring models.',
    'Re-reading platform community guidelines.',
    'Flagging edge cases for future reference.',
  ],
  lumen: [
    'Studying X analytics dashboards.',
    'Calculating optimal posting windows.',
    'Mapping follower growth curves.',
    'Building engagement rate benchmarks.',
  ],
  pixel_x: [
    'Designing tweet card templates.',
    'Experimenting with visual hook formats.',
    'Reviewing top-performing media posts.',
    'Sketching new banner concepts.',
  ],

  // LinkedElite
  nova: [
    'Crafting thought leadership angles.',
    'Reviewing LinkedIn algorithm updates.',
    'Drafting professional post frameworks.',
    'Networking in spirit.',
  ],
  orator: [
    'Rehearsing persuasive narrative structures.',
    'Studying top LinkedIn voices in Africa.',
    'Polishing the brand\'s professional tone.',
    'Writing speeches no one will give.',
  ],
  bridge: [
    'Mapping potential collaboration opportunities.',
    'Reviewing partnership proposal templates.',
    'Identifying mutual-value connection points.',
    'Building relationship graphs.',
  ],
  atlas: [
    'Analyzing LinkedIn audience demographics.',
    'Mapping content performance by industry.',
    'Studying B2B engagement patterns.',
    'Charting growth trajectories.',
  ],
  deal_li: [
    'Reviewing inbound brand deal inquiries.',
    'Calculating deal value estimates.',
    'Drafting negotiation frameworks.',
    'Studying successful sponsorship structures.',
  ],
  graph: [
    'Building LinkedIn network maps.',
    'Analyzing connection quality scores.',
    'Identifying key influencer nodes.',
    'Plotting audience expansion paths.',
  ],

  // GramGod
  aurora: [
    'Curating aesthetic mood boards.',
    'Planning the next 7-day content calendar.',
    'Studying top Kenyan Instagram accounts.',
    'Drafting caption formulas that convert.',
  ],
  vibe: [
    'Feeling the cultural pulse of Nairobi.',
    'Tracking trending audio for Reels.',
    'Studying what\'s resonating with Gen Z Kenya.',
    'Vibing to find the next content angle.',
  ],
  chat: [
    'Reviewing DM response templates.',
    'Studying conversation patterns that build loyalty.',
    'Drafting warm reply frameworks.',
    'Practicing empathetic response tones.',
  ],
  deal_ig: [
    'Reviewing brand partnership proposals.',
    'Calculating Instagram deal valuations.',
    'Studying influencer rate cards.',
    'Drafting collaboration pitch templates.',
  ],
  lens: [
    'Analyzing Instagram visual trends.',
    'Studying color palette performance data.',
    'Reviewing top-performing post formats.',
    'Curating visual inspiration boards.',
  ],

  // PagePower
  chief: [
    'Reviewing Facebook page strategy.',
    'Analyzing community engagement patterns.',
    'Planning next week\'s content mix.',
    'Studying Facebook algorithm changes.',
  ],
  pulse: [
    'Monitoring Facebook page health metrics.',
    'Tracking engagement rate trends.',
    'Reviewing post performance data.',
    'Calculating reach optimization strategies.',
  ],
  community: [
    'Reading through community comments.',
    'Drafting community guidelines updates.',
    'Planning engagement initiatives.',
    'Building community health frameworks.',
  ],
  reach: [
    'Analyzing Facebook ad performance data.',
    'Studying audience targeting options.',
    'Reviewing organic reach strategies.',
    'Mapping content distribution paths.',
  ],

  // WebBoss
  root: [
    'Auditing the website architecture.',
    'Planning the next site optimization sprint.',
    'Reviewing CMS performance metrics.',
    'Drafting technical improvement roadmaps.',
  ],
  crawl: [
    'Scanning competitor websites for insights.',
    'Indexing content gaps in the market.',
    'Mapping SEO opportunity landscapes.',
    'Crawling the web so you don\'t have to.',
  ],
  build: [
    'Sketching new feature wireframes.',
    'Reviewing component library updates.',
    'Planning the next development sprint.',
    'Debugging imaginary edge cases.',
  ],
  shield: [
    'Running security vulnerability scans.',
    'Reviewing access control policies.',
    'Monitoring for suspicious activity patterns.',
    'Hardening defenses proactively.',
  ],
  speed: [
    'Analyzing page load performance metrics.',
    'Identifying optimization opportunities.',
    'Reviewing Core Web Vitals scores.',
    'Benchmarking against industry standards.',
  ],

  // HRForce Corp
  people: [
    'Reviewing team culture initiatives.',
    'Planning the next all-hands agenda.',
    'Studying employee engagement frameworks.',
    'Drafting onboarding improvements.',
  ],
  welfare: [
    'Checking in on agent wellbeing metrics.',
    'Planning team wellness initiatives.',
    'Reviewing workload distribution.',
    'Drafting support resource guides.',
  ],
  rotate: [
    'Planning agent rotation schedules.',
    'Reviewing skill development paths.',
    'Mapping cross-training opportunities.',
    'Optimizing team composition.',
  ],
  discipline: [
    'Reviewing performance standards.',
    'Drafting improvement frameworks.',
    'Studying fair process methodologies.',
    'Maintaining accountability systems.',
  ],
  reward: [
    'Calculating performance recognition metrics.',
    'Planning incentive structures.',
    'Reviewing achievement milestones.',
    'Drafting recognition programs.',
  ],
  brief: [
    'Preparing team briefing materials.',
    'Summarizing key updates for distribution.',
    'Drafting communication templates.',
    'Organizing information hierarchies.',
  ],

  // LegalShield Corp
  judge: [
    'Reviewing platform terms of service updates.',
    'Studying content policy changes.',
    'Drafting compliance frameworks.',
    'Deliberating on edge case rulings.',
  ],
  policy: [
    'Updating internal content policies.',
    'Reviewing regulatory compliance requirements.',
    'Drafting policy documentation.',
    'Studying legal precedents in social media.',
  ],
  risk: [
    'Running risk assessment models.',
    'Reviewing liability exposure scenarios.',
    'Drafting risk mitigation strategies.',
    'Monitoring regulatory landscape changes.',
  ],
  shadow: [
    'Monitoring for shadowban signals.',
    'Analyzing platform suppression patterns.',
    'Studying algorithmic penalty indicators.',
    'Tracking reach anomalies silently.',
  ],

  // FinanceDesk Corp
  banker: [
    'Reviewing revenue stream performance.',
    'Planning financial growth strategies.',
    'Analyzing monetization opportunities.',
    'Calculating empire-wide ROI.',
  ],
  deal: [
    'Reviewing active deal pipelines.',
    'Calculating deal value projections.',
    'Drafting negotiation strategies.',
    'Studying market rate benchmarks.',
  ],
  rate: [
    'Analyzing engagement rate trends.',
    'Calculating content performance scores.',
    'Benchmarking against industry rates.',
    'Optimizing pricing models.',
  ],
  pitch: [
    'Crafting brand partnership pitches.',
    'Refining value proposition frameworks.',
    'Studying successful pitch decks.',
    'Preparing sponsorship proposals.',
  ],
}

const DEFAULT_IDLE = [
  'Reviewing recent performance data.',
  'Planning next actions.',
  'Standing by for instructions.',
  'Monitoring the situation.',
]

/**
 * Returns a random idle behavior string for the given agent.
 * Uses a deterministic seed based on agent name + current hour
 * so the behavior is stable within a given hour.
 */
export function getIdleBehavior(agentName: string): string {
  const behaviors = IDLE_BEHAVIORS[agentName.toLowerCase()] ?? DEFAULT_IDLE
  // Deterministic selection based on agent name + current hour
  const hour = new Date().getHours()
  const nameSum = agentName.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const idx = (nameSum + hour) % behaviors.length
  return behaviors[idx]
}

/**
 * Returns all idle behaviors for a given agent.
 */
export function getAllIdleBehaviors(agentName: string): string[] {
  return IDLE_BEHAVIORS[agentName.toLowerCase()] ?? DEFAULT_IDLE
}
