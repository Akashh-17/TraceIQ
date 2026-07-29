import { StateGraph, END } from '@langchain/langgraph';
import { InvestigationStateAnnotation, InvestigationState } from './investigation.state';
import { investigatorNode } from '../nodes/investigator.node';
import { reporterNode } from '../nodes/reporter.node';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { allTools } from '../tools/ai.tools';
import { AIMessage } from '@langchain/core/messages';

// 1. Create a ToolNode that can execute our tools
const toolNode = new ToolNode(allTools);

// 2. Define the routing logic (Should we call tools, or go to the reporter?)
function shouldContinue(state: InvestigationState) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  // If the LLM made a tool call, route to the 'tools' node
  if (lastMessage instanceof AIMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return 'tools';
  }
  
  // Otherwise, the investigator is done gathering evidence. Pass to reporter.
  return 'reporter';
}

// 3. Build the StateGraph
export const investigationGraph = new StateGraph(InvestigationStateAnnotation)
  .addNode('investigator', investigatorNode)
  .addNode('tools', toolNode)
  .addNode('reporter', reporterNode)
  
  // 4. Define the edges (the flow)
  .addEdge('__start__', 'investigator')
  
  // Investigator can loop back and forth with Tools
  .addConditionalEdges('investigator', shouldContinue, {
    tools: 'tools',
    reporter: 'reporter',
  })
  
  // After tools execute, they ALWAYS go back to the investigator to evaluate the results
  .addEdge('tools', 'investigator')
  
  // Reporter is the final step
  .addEdge('reporter', END)
  
  // Compile the graph into a runnable instance
  .compile();
