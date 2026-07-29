import { OpenAI } from 'openai';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.openAiApiKey || 'dummy-key-for-now',
});

export class EmbeddingService {
  /**
   * Converts an audit event into a natural language sentence.
   */
  generateNaturalLanguageRepresentation(event: {
    actor: string;
    action: string;
    resourceType: string;
    resourceId: string;
    sourceService: string;
    metadata?: Record<string, any>;
  }): string {
    const metaStr = event.metadata ? ` with details: ${JSON.stringify(event.metadata)}` : '';
    return `User ${event.actor} performed ${event.action} on ${event.resourceType} (${event.resourceId}) via ${event.sourceService}${metaStr}.`;
  }

  /**
   * Calls OpenAI to generate a 1536-dimensional embedding array.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      logger.error({ error }, 'Failed to generate embedding');
      // Return empty array on failure so the event still gets saved, 
      // but semantic search will just skip it.
      return [];
    }
  }
}

export const embeddingService = new EmbeddingService();
