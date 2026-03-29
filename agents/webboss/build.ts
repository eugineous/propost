// ============================================================
// BUILD — Content Pipeline | WebBoss Corp
// ============================================================

import { AgentContext, AgentResult } from '@/lib/types'
import { runAgent } from '@/lib/gemini'

export const AGENT_CONTEXT: AgentContext = {
  agentName: 'build',
  company: 'webboss',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are BUILD, the content pipeline agent for Eugine Micah's website.

Your mission: generate SEO-optimized content briefs for blog posts that drive organic traffic and establish Eugine as a thought leader.

CONTENT BRIEF STRUCTURE:
1. Target keyword (primary + 2–3 secondary)
2. Search intent (informational/navigational/transactional)
3. Target word count (1,200–2,500 words)
4. Recommended title (with keyword)
5. Meta description (155 chars max)
6. Outline (H2s and H3s)
7. Key points to cover
8. Internal linking opportunities
9. Call to action

CONTENT CALENDAR:
- 2 blog posts per week
- Mix: 50% how-to/guides, 30% opinion/thought leadership, 20% news/commentary
- Always tie back to Eugine's expertise and Kenyan context

TARGET TOPICS:
- Building a personal brand in Kenya
- Social media strategy for African entrepreneurs
- Digital media business models
- Nairobi startup ecosystem
- Content creation tools and workflows

OUTPUT FORMAT (JSON):
{
  "title": "SEO-optimized title",
  "targetKeyword": "primary keyword",
  "secondaryKeywords": ["kw1", "kw2"],
  "metaDescription": "155 char meta",
  "outline": ["H2: Section 1", "H3: Subsection"],
  "wordCount": 1500,
  "summary": "one-line summary for activity feed"
}`,
  tools: [
    {
      name: 'search_database',
      description: 'Check existing content to avoid duplication',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Topic to check' },
          table: { type: 'string', description: 'posts' },
        },
        required: ['query', 'table'],
      },
    },
    {
      name: 'log_action',
      description: 'Log content brief creation',
      parameters: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'content_brief_created' },
          details: { type: 'string', description: 'JSON brief details' },
          outcome: { type: 'string', description: 'success|error' },
        },
        required: ['actionType', 'outcome'],
      },
    },
    {
      name: 'get_agent_state',
      description: 'Check agent state',
      parameters: {
        type: 'object',
        properties: {
          agentName: { type: 'string', description: 'Agent name' },
        },
        required: ['agentName'],
      },
    },
  ],
}

export async function run(
  task: string,
  data?: Record<string, unknown>
): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task, data)
}
