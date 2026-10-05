import { createInvestigationGraph } from '../graph/investigation.graph';
import { logger } from '../../../config/logger';
import { env } from '../../../config/env';
import { AppError } from '../../../middlewares/errorHandler';

export class AIOrchestratorService {
  async investigate(tenantId: string, query: string) {
    if (!env.googleApiKey) {
      throw new AppError('AI investigation is not configured. Set GOOGLE_API_KEY in the backend .env file.', 503);
    }

    logger.info({ query }, `Starting AI Investigation for tenant ${tenantId}`);

    try {
      const graph = createInvestigationGraph(tenantId);
      const finalState = await graph.invoke(
        { tenantId, query, messages: [] } as any,
        { recursionLimit: 10 }
      );

      return finalState.finalReport;
    } catch (error) {
      logger.error({ err: error }, 'Error during AI orchestration');
      if ((error as { status?: number })?.status === 429) {
        throw new AppError('AI rate limit reached (free tier allows a few requests per minute). Wait a minute and try again.', 429);
      }
      throw new Error('AI Investigation failed.');
    }
  }
}

export const aiOrchestratorService = new AIOrchestratorService();
