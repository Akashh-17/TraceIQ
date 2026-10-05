import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

// Created on first use: the Gemini client throws if constructed without an API key.
let embeddings: GoogleGenerativeAIEmbeddings | null = null;

function getEmbeddings(): GoogleGenerativeAIEmbeddings {
  if (!embeddings) {
    embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: env.googleApiKey,
      model: env.geminiEmbeddingModel,
    });
  }
  return embeddings;
}

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
   * Calls Gemini to generate an embedding vector for the text.
   * Retries up to 3 times with exponential backoff before giving up.
   * Without an API key it returns [] — the event is still stored, it just
   * won't show up in semantic search.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!env.googleApiKey) return [];

    const MAX_ATTEMPTS = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await getEmbeddings().embedQuery(text);
      } catch (error) {
        lastError = error;
        if (attempt < MAX_ATTEMPTS) {
          const delayMs = 500 * 2 ** (attempt - 1); // 500ms, 1000ms
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    logger.error({ err: lastError }, 'Failed to generate embedding after retries');
    return [];
  }
}

export const embeddingService = new EmbeddingService();
