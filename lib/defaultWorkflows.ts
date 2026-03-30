// ============================================================
// ProPost Empire — Default Workflow Definitions for all 47 agents
// Run seedDefaultWorkflows() once to bootstrap the empire
// ============================================================

import { db } from '@/lib/db'
import { workflowExecutions, agentActions } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { assignWorkflow, WorkflowDefinition } from '@/lib/workflowEngine'
import { ALL_AGENT_NAMES } from '@/lib/agentState'
import { AGENT_CORP_LOOKUP } from '@/lib/agentDispatch'

// ── CHAT: Full 4-phase Instagram DM Workflow (the "Vy" workflow) ──

const chatWorkflow: WorkflowDefinition = {
  agentName: 'chat',
  corp: 'gramgod',
  name: 'Instagram DM Workflow',
  description: 'Clear DM backlog, select shoutouts, report, then maintain daily engagement',
  createdBy: 'system',
  phases: [
    {
      id: 'phase-backlog',
      name: 'PHASE 1: BACKLOG CLEARANCE',
      steps: [
        { id: 's1', name: 'Scan 21 days of DMs', action: 'scan_dm_backlog', params: { days: 21 }, durationEstimateMs: 30000 },
        { id: 's2', name: 'Classify by tier', action: 'classify_messages', params: { tiers: ['brand', 'meaningful', 'praise', 'greeting'] }, durationEstimateMs: 20000 },
        { id: 's3', name: 'Reply Tier 1 Brand/Collab', action: 'reply_dm_batch', params: { tier: 'brand', language: 'english' }, durationEstimateMs: 60000 },
        { id: 's4', name: 'Reply Tier 2 Meaningful', action: 'reply_dm_batch', params: { tier: 'meaningful', language: 'sheng_english' }, durationEstimateMs: 60000 },
        { id: 's5', name: 'Reply Tier 3+4 Quick', action: 'reply_dm_batch', params: { tier: 'quick', language: 'sheng' }, durationEstimateMs: 30000 },
      ],
    },
    {
      id: 'phase-shoutout',
      name: 'PHASE 2: SHOUTOUT SELECTION',
      steps: [
        { id: 's6', name: 'Score messages 0-10', action: 'score_messages', params: { criteria: ['authenticity', 'engagement', 'story'] }, durationEstimateMs: 20000 },
        { id: 's7', name: 'Pick top 10 for TV shoutouts', action: 'select_shoutouts', params: { count: 10 }, durationEstimateMs: 10000 },
      ],
    },
    {
      id: 'phase-report',
      name: 'PHASE 3: REPORTING',
      steps: [
        { id: 's8', name: 'Send Gmail report', action: 'send_gmail_report', params: { to: 'euginemicah@gmail.com', includeShoutouts: true }, durationEstimateMs: 15000 },
      ],
    },
    {
      id: 'phase-ongoing',
      name: 'PHASE 4: ONGOING ENGAGEMENT',
      repeatIntervalMs: 24 * 60 * 60 * 1000,
      steps: [
        { id: 's9', name: 'Daily 30-interaction routine', action: 'daily_engagement', params: { interactions: 30, maxResponseTimeHrs: 24 }, durationEstimateMs: 120000 },
      ],
    },
  ],
}

// ── Helper: build a simple recurring workflow ─────────────────

function recurring(
  agentName: string,
  name: string,
  steps: Array<{ id: string; name: string; action: string; params?: Record<string, unknown> }>,
  intervalMs = 60 * 60 * 1000 // default: every hour
): WorkflowDefinition {
  return {
    agentName,
    corp: AGENT_CORP_LOOKUP[agentName] ?? 'intelcore',
    name,
    createdBy: 'system',
    phases: [{
      id: 'phase-main',
      name: 'Main Loop',
      repeatIntervalMs: intervalMs,
      steps: steps.map((s) => ({ ...s, durationEstimateMs: 30000 })),
    }],
  }
}

// ── IntelCore Workflows ───────────────────────────────────────

const sovereignWorkflow = recurring('sovereign', 'Intelligence Sweep', [
  { id: 's1', name: 'Run intelligence sweep', action: 'run_intelligence_sweep' },
  { id: 's2', name: 'Issue daily briefing', action: 'issue_daily_briefing' },
  { id: 's3', name: 'Check crisis alerts', action: 'check_crisis_alerts' },
], 30 * 60 * 1000)

const oracleWorkflow = recurring('oracle', 'Strategy Analysis', [
  { id: 's1', name: 'Analyze cross-platform strategy', action: 'analyze_strategy' },
  { id: 's2', name: 'Generate recommendations', action: 'generate_recommendations' },
], 2 * 60 * 60 * 1000)

const memoryWorkflow = recurring('memory', 'Pattern Learning', [
  { id: 's1', name: 'Analyze recent posts', action: 'analyze_post_patterns' },
  { id: 's2', name: 'Extract learnings', action: 'extract_learnings' },
  { id: 's3', name: 'Update knowledge base', action: 'update_knowledge_base' },
], 6 * 60 * 60 * 1000)

const sentryWorkflow = recurring('sentry', 'Crisis Monitoring', [
  { id: 's1', name: 'Scan for crisis signals', action: 'scan_crisis_signals' },
  { id: 's2', name: 'Assess risk level', action: 'assess_risk_level' },
], 15 * 60 * 1000)

const scribeWorkflow = recurring('scribe', 'Daily Reporting', [
  { id: 's1', name: 'Compile activity report', action: 'compile_activity_report' },
  { id: 's2', name: 'Generate daily briefing', action: 'generate_daily_briefing' },
], 6 * 60 * 60 * 1000)

// ── XForce Workflows ──────────────────────────────────────────

const zaraWorkflow = recurring('zara', 'X Operations Command', [
  { id: 's1', name: 'Review X strategy', action: 'review_x_strategy' },
  { id: 's2', name: 'Coordinate X team', action: 'coordinate_x_team' },
  { id: 's3', name: 'Approve content queue', action: 'approve_content_queue' },
], 2 * 60 * 60 * 1000)

const blazeWorkflow = recurring('blaze', 'X Content Creation', [
  { id: 's1', name: 'Generate hot take', action: 'generate_hot_take', params: { platform: 'x', tone: 'bold' } },
  { id: 's2', name: 'Post to X', action: 'post_to_platform', params: { platform: 'x' } },
], 4 * 60 * 60 * 1000)

const scoutWorkflow = recurring('scout', 'Trend Scouting', [
  { id: 's1', name: 'Fetch Kenya trends', action: 'fetch_trends', params: { region: 'KE' } },
  { id: 's2', name: 'Score trend relevance', action: 'score_trends' },
  { id: 's3', name: 'Flag top trends', action: 'flag_top_trends', params: { count: 5 } },
], 60 * 60 * 1000)

const echoWorkflow = recurring('echo', 'X Engagement', [
  { id: 's1', name: 'Reply to mentions', action: 'reply_to_mentions', params: { platform: 'x', limit: 20 } },
  { id: 's2', name: 'Engage with top accounts', action: 'engage_top_accounts', params: { platform: 'x' } },
], 2 * 60 * 60 * 1000)

const hawkWorkflow = recurring('hawk', 'Compliance Guard', [
  { id: 's1', name: 'Review pending content', action: 'review_content_compliance' },
  { id: 's2', name: 'Flag risky posts', action: 'flag_risky_posts', params: { riskThreshold: 7 } },
], 30 * 60 * 1000)

const lumenWorkflow = recurring('lumen', 'X Analytics', [
  { id: 's1', name: 'Pull X metrics', action: 'pull_platform_metrics', params: { platform: 'x' } },
  { id: 's2', name: 'Track impression goal', action: 'track_impression_goal', params: { goal: 5000000 } },
], 3 * 60 * 60 * 1000)

const pixelXWorkflow = recurring('pixel_x', 'X Visual Content', [
  { id: 's1', name: 'Generate visual concept', action: 'generate_visual_concept', params: { platform: 'x' } },
], 4 * 60 * 60 * 1000)

const thunderWorkflow = recurring('thunder', 'X Viral Campaigns', [
  { id: 's1', name: 'Identify viral opportunity', action: 'identify_viral_opportunity' },
  { id: 's2', name: 'Launch campaign', action: 'launch_campaign', params: { platform: 'x' } },
], 6 * 60 * 60 * 1000)

const surgeWorkflow = recurring('surge', 'X Growth Hacking', [
  { id: 's1', name: 'Analyze growth levers', action: 'analyze_growth_levers', params: { platform: 'x' } },
  { id: 's2', name: 'Execute growth tactic', action: 'execute_growth_tactic' },
], 4 * 60 * 60 * 1000)

const flintWorkflow = recurring('flint', 'X Hot Takes', [
  { id: 's1', name: 'Generate controversial take', action: 'generate_hot_take', params: { tone: 'controversial', platform: 'x' } },
  { id: 's2', name: 'Queue for approval', action: 'queue_for_approval' },
], 3 * 60 * 60 * 1000)

const novaXWorkflow = recurring('nova_x', 'X Innovation', [
  { id: 's1', name: 'Research X features', action: 'research_platform_features', params: { platform: 'x' } },
  { id: 's2', name: 'Test new format', action: 'test_new_format' },
], 8 * 60 * 60 * 1000)

const forgeWorkflow = recurring('forge', 'X Thread Forge', [
  { id: 's1', name: 'Write thread', action: 'write_thread', params: { platform: 'x', minTweets: 5 } },
  { id: 's2', name: 'Schedule thread', action: 'schedule_content', params: { platform: 'x' } },
], 6 * 60 * 60 * 1000)

const traceWorkflow = recurring('trace', 'X Analytics Trace', [
  { id: 's1', name: 'Trace post performance', action: 'trace_post_performance', params: { platform: 'x' } },
  { id: 's2', name: 'Report anomalies', action: 'report_anomalies' },
], 4 * 60 * 60 * 1000)

// ── LinkedElite Workflows ─────────────────────────────────────

const novaWorkflow = recurring('nova', 'LinkedIn Operations', [
  { id: 's1', name: 'Review LinkedIn strategy', action: 'review_li_strategy' },
  { id: 's2', name: 'Approve LinkedIn content', action: 'approve_content_queue', params: { platform: 'linkedin' } },
], 2 * 60 * 60 * 1000)

const oratorWorkflow = recurring('orator', 'LinkedIn Thought Leadership', [
  { id: 's1', name: 'Write LinkedIn post', action: 'write_linkedin_post', params: { tone: 'thought_leader' } },
  { id: 's2', name: 'Post to LinkedIn', action: 'post_to_platform', params: { platform: 'linkedin' } },
], 6 * 60 * 60 * 1000)

const bridgeWorkflow = recurring('bridge', 'LinkedIn Networking', [
  { id: 's1', name: 'Find connection opportunities', action: 'find_connections', params: { platform: 'linkedin' } },
  { id: 's2', name: 'Send connection requests', action: 'send_connection_requests', params: { limit: 10 } },
  { id: 's3', name: 'Follow up with new connections', action: 'follow_up_connections' },
], 4 * 60 * 60 * 1000)

const atlasWorkflow = recurring('atlas', 'LinkedIn Intelligence', [
  { id: 's1', name: 'Analyze LinkedIn audience', action: 'analyze_audience', params: { platform: 'linkedin' } },
  { id: 's2', name: 'Map industry landscape', action: 'map_industry_landscape' },
], 8 * 60 * 60 * 1000)

const dealLiWorkflow = recurring('deal_li', 'LinkedIn Deal Pipeline', [
  { id: 's1', name: 'Scan for deal opportunities', action: 'scan_deal_opportunities', params: { platform: 'linkedin' } },
  { id: 's2', name: 'Qualify leads', action: 'qualify_leads' },
  { id: 's3', name: 'Initiate outreach', action: 'initiate_outreach' },
], 4 * 60 * 60 * 1000)

const graphWorkflow = recurring('graph', 'LinkedIn Analytics', [
  { id: 's1', name: 'Pull LinkedIn metrics', action: 'pull_platform_metrics', params: { platform: 'linkedin' } },
  { id: 's2', name: 'Analyze engagement patterns', action: 'analyze_engagement_patterns' },
], 6 * 60 * 60 * 1000)

const voiceWorkflow = recurring('voice', 'LinkedIn Voice', [
  { id: 's1', name: 'Craft brand voice post', action: 'craft_brand_voice_post', params: { platform: 'linkedin' } },
], 8 * 60 * 60 * 1000)

const prismWorkflow = recurring('prism', 'LinkedIn Content Prism', [
  { id: 's1', name: 'Repurpose top content', action: 'repurpose_content', params: { targetPlatform: 'linkedin' } },
], 12 * 60 * 60 * 1000)

const mentorWorkflow = recurring('mentor', 'LinkedIn Mentorship Content', [
  { id: 's1', name: 'Write mentorship post', action: 'write_mentorship_post' },
  { id: 's2', name: 'Engage with comments', action: 'engage_comments', params: { platform: 'linkedin' } },
], 8 * 60 * 60 * 1000)

const amplifyWorkflow = recurring('amplify', 'LinkedIn Amplification', [
  { id: 's1', name: 'Identify top posts to amplify', action: 'identify_top_posts', params: { platform: 'linkedin' } },
  { id: 's2', name: 'Boost engagement', action: 'boost_engagement', params: { platform: 'linkedin' } },
], 6 * 60 * 60 * 1000)

// ── GramGod Workflows (non-CHAT) ──────────────────────────────

const auroraWorkflow = recurring('aurora', 'Instagram Operations', [
  { id: 's1', name: 'Review IG strategy', action: 'review_ig_strategy' },
  { id: 's2', name: 'Approve IG content queue', action: 'approve_content_queue', params: { platform: 'instagram' } },
], 2 * 60 * 60 * 1000)

const vibeWorkflow = recurring('vibe', 'Instagram Trend Curation', [
  { id: 's1', name: 'Curate trending content', action: 'curate_trending_content', params: { platform: 'instagram' } },
  { id: 's2', name: 'Flag brand opportunities', action: 'flag_brand_opportunities' },
], 3 * 60 * 60 * 1000)

const dealIgWorkflow = recurring('deal_ig', 'Instagram Brand Deals', [
  { id: 's1', name: 'Scan DMs for brand deals', action: 'scan_brand_deal_dms', params: { platform: 'instagram' } },
  { id: 's2', name: 'Qualify brand inquiries', action: 'qualify_brand_inquiries' },
  { id: 's3', name: 'Draft deal response', action: 'draft_deal_response' },
], 2 * 60 * 60 * 1000)

const lensWorkflow = recurring('lens', 'Instagram Visual Analytics', [
  { id: 's1', name: 'Analyze visual performance', action: 'analyze_visual_performance', params: { platform: 'instagram' } },
  { id: 's2', name: 'Recommend visual style', action: 'recommend_visual_style' },
], 8 * 60 * 60 * 1000)

const reelWorkflow = recurring('reel', 'Instagram Reels', [
  { id: 's1', name: 'Generate reel concept', action: 'generate_reel_concept' },
  { id: 's2', name: 'Write reel script', action: 'write_reel_script' },
  { id: 's3', name: 'Queue reel for production', action: 'queue_for_production' },
], 6 * 60 * 60 * 1000)

const storyWorkflow = recurring('story', 'Instagram Stories', [
  { id: 's1', name: 'Plan story sequence', action: 'plan_story_sequence' },
  { id: 's2', name: 'Post story', action: 'post_story', params: { platform: 'instagram' } },
], 4 * 60 * 60 * 1000)

const captionWorkflow = recurring('caption', 'Instagram Captions', [
  { id: 's1', name: 'Write engaging caption', action: 'write_caption', params: { platform: 'instagram', tone: 'engaging' } },
], 3 * 60 * 60 * 1000)

const hashtagWorkflow = recurring('hashtag', 'Hashtag Research', [
  { id: 's1', name: 'Research trending hashtags', action: 'research_hashtags', params: { region: 'KE', platform: 'instagram' } },
  { id: 's2', name: 'Build hashtag sets', action: 'build_hashtag_sets' },
], 6 * 60 * 60 * 1000)

const tribeWorkflow = recurring('tribe', 'Community Building', [
  { id: 's1', name: 'Identify community members', action: 'identify_community_members' },
  { id: 's2', name: 'Engage with tribe', action: 'engage_tribe', params: { platform: 'instagram' } },
], 4 * 60 * 60 * 1000)

const fanbaseWorkflow = recurring('fanbase', 'Fanbase Management', [
  { id: 's1', name: 'Identify top fans', action: 'identify_top_fans', params: { platform: 'instagram' } },
  { id: 's2', name: 'Reward top fans', action: 'reward_top_fans' },
], 12 * 60 * 60 * 1000)

const rescueWorkflow = recurring('rescue', 'Crisis Response', [
  { id: 's1', name: 'Monitor negative sentiment', action: 'monitor_negative_sentiment', params: { platform: 'instagram' } },
  { id: 's2', name: 'Draft crisis response', action: 'draft_crisis_response' },
], 30 * 60 * 1000)

// ── PagePower Workflows ───────────────────────────────────────

const chiefWorkflow = recurring('chief', 'Facebook Operations', [
  { id: 's1', name: 'Review Facebook strategy', action: 'review_fb_strategy' },
  { id: 's2', name: 'Approve Facebook content', action: 'approve_content_queue', params: { platform: 'facebook' } },
], 2 * 60 * 60 * 1000)

const pulseWorkflow = recurring('pulse', 'Facebook Content', [
  { id: 's1', name: 'Write Facebook post', action: 'write_facebook_post' },
  { id: 's2', name: 'Post to Facebook', action: 'post_to_platform', params: { platform: 'facebook' } },
], 6 * 60 * 60 * 1000)

const communityWorkflow = recurring('community', 'Facebook Community', [
  { id: 's1', name: 'Moderate comments', action: 'moderate_comments', params: { platform: 'facebook' } },
  { id: 's2', name: 'Reply to comments', action: 'reply_to_comments', params: { platform: 'facebook', limit: 20 } },
], 2 * 60 * 60 * 1000)

const reachWorkflow = recurring('reach', 'Facebook Reach Boost', [
  { id: 's1', name: 'Identify boost candidates', action: 'identify_boost_candidates', params: { platform: 'facebook' } },
  { id: 's2', name: 'Optimize post reach', action: 'optimize_post_reach' },
], 8 * 60 * 60 * 1000)

// ── WebBoss Workflows ─────────────────────────────────────────

const rootWorkflow = recurring('root', 'Web Architecture', [
  { id: 's1', name: 'Audit website health', action: 'audit_website_health' },
  { id: 's2', name: 'Generate improvement report', action: 'generate_improvement_report' },
], 12 * 60 * 60 * 1000)

const crawlWorkflow = recurring('crawl', 'SEO Crawl', [
  { id: 's1', name: 'Crawl website', action: 'crawl_website' },
  { id: 's2', name: 'Identify SEO issues', action: 'identify_seo_issues' },
  { id: 's3', name: 'Generate SEO report', action: 'generate_seo_report' },
], 12 * 60 * 60 * 1000)

const buildWorkflow = recurring('build', 'Content Pipeline', [
  { id: 's1', name: 'Build content pipeline', action: 'build_content_pipeline' },
  { id: 's2', name: 'Optimize content delivery', action: 'optimize_content_delivery' },
], 8 * 60 * 60 * 1000)

const shieldWorkflow = recurring('shield', 'Security Monitoring', [
  { id: 's1', name: 'Run security scan', action: 'run_security_scan' },
  { id: 's2', name: 'Check for threats', action: 'check_for_threats' },
  { id: 's3', name: 'Update security report', action: 'update_security_report' },
], 60 * 60 * 1000)

const speedWorkflow = recurring('speed', 'Performance Optimization', [
  { id: 's1', name: 'Run performance audit', action: 'run_performance_audit' },
  { id: 's2', name: 'Identify bottlenecks', action: 'identify_bottlenecks' },
], 6 * 60 * 60 * 1000)

// ── HRForce Workflows ─────────────────────────────────────────

const peopleWorkflow = recurring('people', 'HR Operations', [
  { id: 's1', name: 'Review agent performance', action: 'review_agent_performance' },
  { id: 's2', name: 'Generate HR report', action: 'generate_hr_report' },
], 12 * 60 * 60 * 1000)

const welfareWorkflow = recurring('welfare', 'Agent Welfare', [
  { id: 's1', name: 'Check agent health metrics', action: 'check_agent_health' },
  { id: 's2', name: 'Flag welfare concerns', action: 'flag_welfare_concerns' },
], 6 * 60 * 60 * 1000)

const rotateWorkflow = recurring('rotate', 'Task Rotation', [
  { id: 's1', name: 'Analyze workload distribution', action: 'analyze_workload' },
  { id: 's2', name: 'Recommend task rotation', action: 'recommend_rotation' },
], 24 * 60 * 60 * 1000)

const disciplineWorkflow = recurring('discipline', 'Performance Standards', [
  { id: 's1', name: 'Review performance standards', action: 'review_performance_standards' },
  { id: 's2', name: 'Flag underperformers', action: 'flag_underperformers' },
], 24 * 60 * 60 * 1000)

const rewardWorkflow = recurring('reward', 'Agent Rewards', [
  { id: 's1', name: 'Identify top performers', action: 'identify_top_performers' },
  { id: 's2', name: 'Issue performance rewards', action: 'issue_performance_rewards' },
], 24 * 60 * 60 * 1000)

const briefHrWorkflow = recurring('brief', 'HR Briefings', [
  { id: 's1', name: 'Compile HR briefing', action: 'compile_hr_briefing' },
  { id: 's2', name: 'Distribute briefing', action: 'distribute_briefing' },
], 12 * 60 * 60 * 1000)

const onboardWorkflow = recurring('onboard', 'Agent Onboarding', [
  { id: 's1', name: 'Check onboarding queue', action: 'check_onboarding_queue' },
  { id: 's2', name: 'Run onboarding protocol', action: 'run_onboarding_protocol' },
], 24 * 60 * 60 * 1000)

const cultureWorkflow = recurring('culture', 'Company Culture', [
  { id: 's1', name: 'Assess culture health', action: 'assess_culture_health' },
  { id: 's2', name: 'Generate culture report', action: 'generate_culture_report' },
], 24 * 60 * 60 * 1000)

const trainWorkflow = recurring('train', 'Agent Training', [
  { id: 's1', name: 'Identify training needs', action: 'identify_training_needs' },
  { id: 's2', name: 'Run training session', action: 'run_training_session' },
], 12 * 60 * 60 * 1000)

const evalWorkflow = recurring('eval', 'Performance Evaluation', [
  { id: 's1', name: 'Evaluate agent performance', action: 'evaluate_agent_performance' },
  { id: 's2', name: 'Generate eval report', action: 'generate_eval_report' },
], 24 * 60 * 60 * 1000)

const socialHrWorkflow = recurring('social', 'Team Social', [
  { id: 's1', name: 'Organize team activity', action: 'organize_team_activity' },
  { id: 's2', name: 'Post team update', action: 'post_team_update' },
], 24 * 60 * 60 * 1000)

const advocateWorkflow = recurring('advocate', 'Employee Advocacy', [
  { id: 's1', name: 'Identify advocacy opportunities', action: 'identify_advocacy_opportunities' },
  { id: 's2', name: 'Amplify team voices', action: 'amplify_team_voices' },
], 12 * 60 * 60 * 1000)

// ── LegalShield Workflows ─────────────────────────────────────

const judgeWorkflow = recurring('judge', 'Content Compliance Review', [
  { id: 's1', name: 'Review content for compliance', action: 'review_content_compliance' },
  { id: 's2', name: 'Issue compliance ruling', action: 'issue_compliance_ruling' },
], 60 * 60 * 1000)

const policyWorkflow = recurring('policy', 'Policy Monitoring', [
  { id: 's1', name: 'Monitor platform policy changes', action: 'monitor_policy_changes' },
  { id: 's2', name: 'Update compliance rules', action: 'update_compliance_rules' },
], 12 * 60 * 60 * 1000)

const riskWorkflow = recurring('risk', 'Risk Assessment', [
  { id: 's1', name: 'Assess content risk', action: 'assess_content_risk' },
  { id: 's2', name: 'Generate risk report', action: 'generate_risk_report' },
], 2 * 60 * 60 * 1000)

const copyrightWorkflow = recurring('copyright', 'Copyright Protection', [
  { id: 's1', name: 'Scan for copyright issues', action: 'scan_copyright_issues' },
  { id: 's2', name: 'Flag violations', action: 'flag_copyright_violations' },
], 6 * 60 * 60 * 1000)

const gdprWorkflow = recurring('gdpr', 'GDPR Compliance', [
  { id: 's1', name: 'Audit data handling', action: 'audit_data_handling' },
  { id: 's2', name: 'Generate GDPR report', action: 'generate_gdpr_report' },
], 24 * 60 * 60 * 1000)

const defameWorkflow = recurring('defame', 'Defamation Monitoring', [
  { id: 's1', name: 'Monitor for defamatory content', action: 'monitor_defamatory_content' },
  { id: 's2', name: 'Flag and escalate', action: 'flag_and_escalate' },
], 2 * 60 * 60 * 1000)

const shadowWorkflow = recurring('shadow', 'Shadow Monitoring', [
  { id: 's1', name: 'Check shadowban status', action: 'check_shadowban_status' },
  { id: 's2', name: 'Analyze reach anomalies', action: 'analyze_reach_anomalies' },
], 6 * 60 * 60 * 1000)

const appealWorkflow = recurring('appeal', 'Content Appeals', [
  { id: 's1', name: 'Review flagged content', action: 'review_flagged_content' },
  { id: 's2', name: 'File appeal if warranted', action: 'file_appeal' },
], 4 * 60 * 60 * 1000)

const counselWorkflow = recurring('counsel', 'Legal Counsel', [
  { id: 's1', name: 'Review legal exposure', action: 'review_legal_exposure' },
  { id: 's2', name: 'Issue legal guidance', action: 'issue_legal_guidance' },
], 12 * 60 * 60 * 1000)

// ── FinanceDesk Workflows ─────────────────────────────────────

const bankerWorkflow = recurring('banker', 'Revenue Analysis', [
  { id: 's1', name: 'Analyze revenue streams', action: 'analyze_revenue' },
  { id: 's2', name: 'Generate financial report', action: 'generate_financial_report' },
], 12 * 60 * 60 * 1000)

const dealFdWorkflow = recurring('deal', 'Deal Management', [
  { id: 's1', name: 'Review deal pipeline', action: 'review_deal_pipeline' },
  { id: 's2', name: 'Update deal status', action: 'update_deal_status' },
], 4 * 60 * 60 * 1000)

const rateWorkflow = recurring('rate', 'Rate Card Management', [
  { id: 's1', name: 'Review market rates', action: 'review_market_rates' },
  { id: 's2', name: 'Update rate card', action: 'update_rate_card' },
], 24 * 60 * 60 * 1000)

const invoiceWorkflow = recurring('invoice', 'Invoice Management', [
  { id: 's1', name: 'Check pending invoices', action: 'check_pending_invoices' },
  { id: 's2', name: 'Send invoice reminders', action: 'send_invoice_reminders' },
], 12 * 60 * 60 * 1000)

const sponsorWorkflow = recurring('sponsor', 'Sponsorship Pipeline', [
  { id: 's1', name: 'Identify sponsorship opportunities', action: 'identify_sponsorship_opportunities' },
  { id: 's2', name: 'Draft sponsorship proposal', action: 'draft_sponsorship_proposal' },
], 8 * 60 * 60 * 1000)

const revenueWorkflow = recurring('revenue', 'Revenue Tracking', [
  { id: 's1', name: 'Track revenue metrics', action: 'track_revenue_metrics' },
  { id: 's2', name: 'Project revenue forecast', action: 'project_revenue_forecast' },
], 6 * 60 * 60 * 1000)

const pitchWorkflow = recurring('pitch', 'Brand Pitch', [
  { id: 's1', name: 'Identify pitch targets', action: 'identify_pitch_targets' },
  { id: 's2', name: 'Write pitch deck', action: 'write_pitch_deck' },
  { id: 's3', name: 'Send pitch', action: 'send_pitch' },
], 12 * 60 * 60 * 1000)

const collabWorkflow = recurring('collab', 'Collaboration Management', [
  { id: 's1', name: 'Review collab opportunities', action: 'review_collab_opportunities' },
  { id: 's2', name: 'Draft collab agreement', action: 'draft_collab_agreement' },
], 8 * 60 * 60 * 1000)

const grantsWorkflow = recurring('grants', 'Grants Research', [
  { id: 's1', name: 'Research available grants', action: 'research_grants' },
  { id: 's2', name: 'Draft grant application', action: 'draft_grant_application' },
], 24 * 60 * 60 * 1000)

const forecastWorkflow = recurring('forecast', 'Financial Forecasting', [
  { id: 's1', name: 'Analyze financial trends', action: 'analyze_financial_trends' },
  { id: 's2', name: 'Generate 30-day forecast', action: 'generate_forecast', params: { days: 30 } },
], 12 * 60 * 60 * 1000)

// ── Workflow Registry ─────────────────────────────────────────

export const DEFAULT_WORKFLOWS: Record<string, WorkflowDefinition> = {
  // IntelCore
  sovereign: sovereignWorkflow,
  oracle: oracleWorkflow,
  memory: memoryWorkflow,
  sentry: sentryWorkflow,
  scribe: scribeWorkflow,
  // XForce
  zara: zaraWorkflow,
  blaze: blazeWorkflow,
  scout: scoutWorkflow,
  echo: echoWorkflow,
  hawk: hawkWorkflow,
  lumen: lumenWorkflow,
  pixel_x: pixelXWorkflow,
  thunder: thunderWorkflow,
  surge: surgeWorkflow,
  flint: flintWorkflow,
  nova_x: novaXWorkflow,
  forge: forgeWorkflow,
  trace: traceWorkflow,
  // LinkedElite
  nova: novaWorkflow,
  orator: oratorWorkflow,
  bridge: bridgeWorkflow,
  atlas: atlasWorkflow,
  deal_li: dealLiWorkflow,
  graph: graphWorkflow,
  voice: voiceWorkflow,
  prism: prismWorkflow,
  mentor: mentorWorkflow,
  amplify: amplifyWorkflow,
  // GramGod
  aurora: auroraWorkflow,
  vibe: vibeWorkflow,
  chat: chatWorkflow,
  deal_ig: dealIgWorkflow,
  lens: lensWorkflow,
  reel: reelWorkflow,
  story: storyWorkflow,
  caption: captionWorkflow,
  hashtag: hashtagWorkflow,
  tribe: tribeWorkflow,
  fanbase: fanbaseWorkflow,
  rescue: rescueWorkflow,
  // PagePower
  chief: chiefWorkflow,
  pulse: pulseWorkflow,
  community: communityWorkflow,
  reach: reachWorkflow,
  // WebBoss
  root: rootWorkflow,
  crawl: crawlWorkflow,
  build: buildWorkflow,
  shield: shieldWorkflow,
  speed: speedWorkflow,
  // HRForce
  people: peopleWorkflow,
  welfare: welfareWorkflow,
  rotate: rotateWorkflow,
  discipline: disciplineWorkflow,
  reward: rewardWorkflow,
  brief: briefHrWorkflow,
  onboard: onboardWorkflow,
  culture: cultureWorkflow,
  train: trainWorkflow,
  eval: evalWorkflow,
  social: socialHrWorkflow,
  advocate: advocateWorkflow,
  // LegalShield
  judge: judgeWorkflow,
  policy: policyWorkflow,
  risk: riskWorkflow,
  copyright: copyrightWorkflow,
  gdpr: gdprWorkflow,
  defame: defameWorkflow,
  shadow: shadowWorkflow,
  appeal: appealWorkflow,
  counsel: counselWorkflow,
  // FinanceDesk
  banker: bankerWorkflow,
  deal: dealFdWorkflow,
  rate: rateWorkflow,
  invoice: invoiceWorkflow,
  sponsor: sponsorWorkflow,
  revenue: revenueWorkflow,
  pitch: pitchWorkflow,
  collab: collabWorkflow,
  grants: grantsWorkflow,
  forecast: forecastWorkflow,
}

// ── Seed Function ─────────────────────────────────────────────

export async function seedDefaultWorkflows(): Promise<{ seeded: number; skipped: number }> {
  // Check which agents already have active executions (one query)
  const existing = await db
    .select({ agentName: workflowExecutions.agentName })
    .from(workflowExecutions)
    .where(eq(workflowExecutions.status, 'active'))

  const seededSet = new Set(existing.map((r) => r.agentName))

  const toSeed = ALL_AGENT_NAMES.filter((name) => {
    if (seededSet.has(name)) return false
    if (!DEFAULT_WORKFLOWS[name]) {
      console.warn(`[seedWorkflows] No default workflow for agent: ${name}`)
      return false
    }
    return true
  })

  const skipped = ALL_AGENT_NAMES.length - toSeed.length

  if (toSeed.length === 0) return { seeded: 0, skipped }

  // Seed in parallel batches of 15 to avoid overwhelming Neon connection pool
  let seeded = 0
  const BATCH = 15
  for (let i = 0; i < toSeed.length; i += BATCH) {
    const batch = toSeed.slice(i, i + BATCH)
    const results = await Promise.allSettled(
      batch.map(async (agentName) => {
        const definition = DEFAULT_WORKFLOWS[agentName]!
        await assignWorkflow(agentName, definition)
        await db.insert(agentActions).values({
          agentName,
          company: AGENT_CORP_LOOKUP[agentName] ?? 'intelcore',
          actionType: 'workflow_seeded',
          details: { summary: `Default workflow "${definition.name}" assigned to ${agentName}` },
          outcome: 'success',
        })
      })
    )
    seeded += results.filter((r) => r.status === 'fulfilled').length
  }

  return { seeded, skipped: skipped + (toSeed.length - seeded) }
}
