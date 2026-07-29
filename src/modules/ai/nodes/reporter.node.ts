import { ChatOpenAI } from '@langchain/openai';
import { InvestigationState } from '../graph/investigation.state';
import { env } from '../../../config/env';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';

// We use structured outputs for Agent 2 so the API returns perfect JSON.
const reportSchema = z.object({
  summary: z.string().describe('Executive summary of the investigation.'),
  findings: z.array(z.string()).describe('Key technical findings, citing specific events.'),
  recommendations: z.array(z.string()).describe('Recommended next steps for the security team.')
});

const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.2, // slight temperature for better prose
  apiKey: env.openAiApiKey || 'dummy-key',
});

const structuredModel = model.withStructuredOutput(reportSchema);

export const reporterNode = async (state: InvestigationState): Promise<Partial<InvestigationState>> => {
  const { messages, query } = state;

  // Extract all the raw evidence gathered by Agent 1 from the message history
  const evidenceStr = messages
    .filter(m => m._getType() === 'ai' || m._getType() === 'tool')
    .map(m => `[${m._getType().toUpperCase()}]: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
    .join('\n\n');

  const systemPrompt = new SystemMessage(
    `You are a Compliance Investigation Specialist (Agent 2).
Your job is to read the raw technical evidence gathered by the Investigation Agent and produce a structured executive report.
Do NOT invent events. Only base your findings on the evidence provided below.
The user originally asked: "${query}"

EVIDENCE:
${evidenceStr}`
  );

  // Invoke the structured LLM
  const finalReport = await structuredModel.invoke([systemPrompt]);

  // Update the state with the final report
  return { finalReport };
};
