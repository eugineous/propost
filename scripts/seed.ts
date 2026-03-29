// Seed script — run once to populate initial data
import { neon } from '@neondatabase/serverless'

const DB_URL = "postgresql://neondb_owner:npg_CNh1uQDW0wSp@ep-raspy-morning-a4dea0lm-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
const sql = neon(DB_URL)

async function seed() {
  console.log('Seeding ProPost Empire database...')

  // Seed agent_actions with startup event
  await sql`
    INSERT INTO agent_actions (agent_name, company, action_type, details, outcome)
    VALUES 
      ('sovereign', 'intelcore', 'empire_startup', '{"message":"ProPost Empire initialized. All 31 agents online.","version":"1.0"}', 'success'),
      ('scout', 'xforce', 'trends_fetched', '{"summary":"Found 8 trending topics in Kenya","trends":["#KenyaElections","#NairobiTech","#AfricanMedia","#UrbanNews"],"region":"KE"}', 'success'),
      ('scribe', 'intelcore', 'daily_briefing', '{"summary":"Empire is online. Instagram has 847 unread DMs. CHAT is processing backlog. SCOUT found 8 Kenya trends. BLAZE has 3 draft posts ready.","actionsAnalyzed":12}', 'success'),
      ('chat', 'gramgod', 'dm_backlog_reply', '{"summary":"Replied to 12 of 47 DMs","dmCount":47,"replied":12}', 'success'),
      ('blaze', 'xforce', 'post_generated', '{"summary":"Generated hot_take idea","hook":"Why Kenyan media is sleeping on AI","content":"The media industry in Kenya is at a crossroads. AI tools are here. The question is: who adapts first?","type":"hot_take"}', 'success'),
      ('memory', 'intelcore', 'pattern_analysis', '{"summary":"Analyzed 0 posts, extracted patterns","postsAnalyzed":0,"learnings":["Start posting consistently to build pattern data","Instagram engagement peaks 7-9PM EAT","Short-form video outperforms static posts 3:1"]}', 'success'),
      ('sentry', 'intelcore', 'crisis_check', '{"summary":"No crisis detected. All platforms nominal.","platforms":["instagram","x","linkedin","facebook"],"alertLevel":0}', 'success'),
      ('aurora', 'gramgod', 'content_planned', '{"summary":"Planned 3 Instagram posts for this week","posts":["Behind the scenes at Urban News","Nairobi tech scene thread","Fan appreciation post"]}', 'success')
    ON CONFLICT DO NOTHING
  `

  // Seed daily_metrics with Instagram data (will be overwritten by real data)
  const today = new Date().toISOString().split('T')[0]
  await sql`
    INSERT INTO daily_metrics (date, platform, followers, impressions, engagement_rate, posts_published, replies_sent)
    VALUES 
      (${today}, 'instagram', 0, 0, 0, 0, 0),
      (${today}, 'x', 0, 0, 0, 0, 0),
      (${today}, 'linkedin', 0, 0, 0, 0, 0),
      (${today}, 'facebook', 0, 0, 0, 0, 0)
    ON CONFLICT (date, platform) DO NOTHING
  `

  // Seed trends
  await sql`
    INSERT INTO trends (trend_text, region, source, relevance_score)
    VALUES 
      ('#KenyaMedia', 'KE', 'google_trends', 0.95),
      ('#NairobiTech', 'KE', 'google_trends', 0.88),
      ('#AfricanEntrepreneur', 'KE', 'google_trends', 0.82),
      ('#UrbanNews', 'KE', 'google_trends', 0.91),
      ('#PPPTVKenya', 'KE', 'google_trends', 0.97),
      ('#KenyaEntertainment', 'KE', 'google_trends', 0.79),
      ('#NairobiLife', 'KE', 'google_trends', 0.75),
      ('#KenyaTwitter', 'KE', 'google_trends', 0.85)
    ON CONFLICT DO NOTHING
  `

  // Seed HRForce Corp startup actions
  await sql`
    INSERT INTO agent_actions (agent_name, company, action_type, details, outcome)
    VALUES 
      ('people', 'hrforce', 'empire_startup', '{"message":"HRForce Corp online. People, Welfare, Rotate, Discipline, Reward, Brief agents ready.","version":"2.0"}', 'success'),
      ('welfare', 'hrforce', 'wellness_check', '{"summary":"All 31 agents reporting healthy workload levels. No burnout signals detected."}', 'success'),
      ('judge', 'legalshield', 'empire_startup', '{"message":"LegalShield Corp online. Judge, Policy, Risk, Shadow agents ready.","version":"2.0"}', 'success'),
      ('risk', 'legalshield', 'risk_assessment', '{"summary":"Platform compliance risk: LOW. All content policies up to date.","riskLevel":"low"}', 'success'),
      ('banker', 'financedesk', 'empire_startup', '{"message":"FinanceDesk Corp online. Banker, Deal, Rate, Pitch agents ready.","version":"2.0"}', 'success'),
      ('pitch', 'financedesk', 'pitch_prepared', '{"summary":"3 brand partnership pitches ready for review. Estimated combined value: KES 450,000."}', 'success')
    ON CONFLICT DO NOTHING
  `

  console.log('✅ Database seeded successfully!')
  console.log('Tables populated: agent_actions, daily_metrics, trends')
  console.log('New corps: HRForce, LegalShield, FinanceDesk')
}

seed().catch(console.error)
