import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
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

export const reporterNode = async (state: InvestigationState): Promise<Partial<InvestigationState>> => {
  const { messages, query } = state;

  // Built per call, not at import time: the Gemini client throws if no API key is set.
  const model = new ChatGoogleGenerativeAI({
    model: env.geminiChatModel,
    temperature: 0.2, // slight temperature for better prose
    apiKey: env.googleApiKey,
    maxRetries: 1, // fail fast on rate limits instead of backing off for minutes
  });
  const structuredModel = model.withStructuredOutput(reportSchema);

  // Extract all the raw evidence gathered by Agent 1 from the message history
  const evidenceStr = messages
    .filter(m => m._getType() === 'ai' || m._getType() === 'tool')
    .map(m => `[${m._getType().toUpperCase()}]: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
    .join('\n\n');

  const systemPrompt = new SystemMessage(
    `You are a Compliance Investigation Specialist (Agent 2).
Your job is to read the raw technical evidence gathered by the Investigation Agent and produce a structured executive report.
Do NOT invent events. Only base your findings on the evidence provided.`
  );

  // Gemini requires at least one user message; the system prompt alone is rejected.
  const evidenceMessage = new HumanMessage(
    `The user originally asked: "${query}"

EVIDENCE:
${evidenceStr}`
  );

  const finalReport = await structuredModel.invoke([systemPrompt, evidenceMessage]);

  // Update the state with the final report
  return { finalReport };
};
