import { ChatOpenAI } from '@langchain/openai';
import { allTools } from '../tools/ai.tools';
import { InvestigationState } from '../graph/investigation.state';
import { env } from '../../../config/env';
import { SystemMessage, HumanMessage, ToolMessage, AIMessage } from '@langchain/core/messages';

// Initialize the OpenAI model (Agent 1)
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
  apiKey: env.openAiApiKey || 'dummy-key',
});

// Bind our tools to the model
const modelWithTools = model.bindTools(allTools);

export const investigatorNode = async (state: InvestigationState): Promise<Partial<InvestigationState>> => {
  const { messages, tenantId, query } = state;

  // If this is the very first run, add the system prompt and the user query
  const inputMessages = [...messages];
  if (inputMessages.length === 0) {
    inputMessages.push(
      new SystemMessage(
        `You are a Technical Security Investigator for TraceIQ. 
Your job is to gather evidence from the database to answer the user's query.
You have tools to exact-search, semantic-search, get timelines, and get deterministic backend detections.
ALWAYS use your tools to find data. 
The tenantId for this investigation is: ${tenantId}.

IMPORTANT: You are NOT the reporter. Do not generate a final executive summary.
Once you have enough evidence, simply summarize your raw findings and stop calling tools.`
      ),
      new HumanMessage(query)
    );
  }

  // Invoke the LLM with the current conversation state
  const response = await modelWithTools.invoke(inputMessages);

  // Return the AI's response to be appended to the state
  return { messages: [response] };
};
