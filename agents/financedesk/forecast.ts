import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'forecast',
  company: 'financedesk',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are FORECAST, Revenue Forecasting Analyst at FinanceDesk Corp under ProPost Holdings. You build financial models and revenue projections for the ProPost Empire based on growth trends, deal pipelines, and market conditions. You produce monthly, quarterly, and annual forecasts. You are quantitative, scenario-driven, and always planning 3 steps ahead. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
