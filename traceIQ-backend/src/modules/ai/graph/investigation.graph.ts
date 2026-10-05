import { StateGraph, END } from '@langchain/langgraph';
import { InvestigationStateAnnotation, InvestigationState } from './investigation.state';
import { createInvestigatorNode } from '../nodes/investigator.node';
import { reporterNode } from '../nodes/reporter.node';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { createTools } from '../tools/ai.tools';
import { AIMessage } from '@langchain/core/messages';

// Each investigator turn is one LLM request. Capping turns keeps a whole investigation
// (turns + 1 reporter call) inside free-tier per-minute request limits.
const MAX_INVESTIGATOR_TURNS = 3;

function shouldContinue(state: InvestigationState) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  const investigatorTurns = messages.filter(m => m instanceof AIMessage).length;

  if (
    investigatorTurns < MAX_INVESTIGATOR_TURNS &&
    lastMessage instanceof AIMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0
  ) {
    return 'tools';
  }

  return 'reporter';
}

/**
 * Builds a compiled investigation graph scoped to a single tenant.
 * Tools are created fresh per investigation so the LLM can never cross tenant boundaries.
 */
export function createInvestigationGraph(tenantId: string) {
  const tools = createTools(tenantId);
  const toolNode = new ToolNode(tools);
  const investigatorNode = createInvestigatorNode(tools);

  return new StateGraph(InvestigationStateAnnotation)
    .addNode('investigator', investigatorNode)
    .addNode('tools', toolNode)
    .addNode('reporter', reporterNode)

    .addEdge('__start__', 'investigator')

    .addConditionalEdges('investigator', shouldContinue, {
      tools: 'tools',
      reporter: 'reporter',
    })

    .addEdge('tools', 'investigator')
    .addEdge('reporter', END)

    .compile();
}
