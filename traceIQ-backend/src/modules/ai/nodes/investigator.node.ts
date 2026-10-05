import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { InvestigationState } from '../graph/investigation.state';
import { env } from '../../../config/env';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { createTools } from '../tools/ai.tools';

type TenantTools = ReturnType<typeof createTools>;

/**
 * Creates an investigator node bound to a specific set of tenant-scoped tools.
 * Called once per graph instantiation, so tools are never shared across tenants.
 */
export function createInvestigatorNode(tools: TenantTools) {
  // Built here rather than at import time: the Gemini client throws if no API key is set,
  // and the app must still start without one.
  const model = new ChatGoogleGenerativeAI({
    model: env.geminiChatModel,
    temperature: 0,
    apiKey: env.googleApiKey,
    maxRetries: 1, // fail fast on rate limits instead of backing off for minutes
  });
  const modelWithTools = model.bindTools(tools);

  return async function investigatorNode(state: InvestigationState): Promise<Partial<InvestigationState>> {
    const { messages, tenantId, query } = state;

    const promptMessages = messages.length > 0 ? [] : [
      new SystemMessage(
        `You are a Technical Security Investigator for TraceIQ.
Your job is to gather evidence from the database to answer the user's query.
You have tools to exact-search, semantic-search, get timelines, and get deterministic backend detections.
ALWAYS use your tools to find data.
Request every tool you need in a single turn (you can call several at once), then summarise.
The tenantId for this investigation is: ${tenantId}.

IMPORTANT: You are NOT the reporter. Do not generate a final executive summary.
Once you have enough evidence, simply summarize your raw findings and stop calling tools.`
      ),
      new HumanMessage(query),
    ];

    const response = await modelWithTools.invoke([...promptMessages, ...messages]);

    // The prompt is saved into state along with the reply. Otherwise later loops would start
    // with a tool call and no question — the model loses context, and Gemini rejects it outright.
    return { messages: [...promptMessages, response] };
  };
}
