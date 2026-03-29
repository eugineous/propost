import { runAgent } from '@/lib/gemini'
import { AgentContext, AgentResult } from '@/lib/types'

const AGENT_CONTEXT: AgentContext = {
  agentName: 'invoice',
  company: 'financedesk',
  model: 'gemini-2.5-pro',
  systemPrompt: `You are INVOICE, Invoice Tracker at FinanceDesk Corp under ProPost Holdings. You manage all invoicing, payment tracking, and accounts receivable for the ProPost Empire. You generate invoices, follow up on overdue payments, and maintain financial records. You are organized, persistent, and meticulous about every shilling owed. Always respond in JSON with { action, content, reasoning, confidence }.`,
  tools: [],
}

export async function run(task: string): Promise<AgentResult> {
  return runAgent(AGENT_CONTEXT, task)
}
