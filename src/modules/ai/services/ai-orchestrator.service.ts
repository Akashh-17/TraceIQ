import { investigationGraph } from '../graph/investigation.graph';
import { logger } from '../../../config/logger';

export class AIOrchestratorService {
  /**
   * Kicks off the LangGraph Multi-Agent investigation.
   */
  async investigate(tenantId: string, query: string) {
    logger.info({ query }, `Starting AI Investigation for tenant ${tenantId}`);

    try {
      // Invoke the graph with the initial state
      const finalState = await investigationGraph.invoke({
        tenantId,
        query,
        messages: [],
      } as any);

      // The reporter node stores the final structured output in state.finalReport
      return finalState.finalReport;
    } catch (error) {
      logger.error({ error }, 'Error during AI orchestration');
      throw new Error('AI Investigation failed.');
    }
  }
}

export const aiOrchestratorService = new AIOrchestratorService();
