import { embeddingService } from '../embedding.service';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { prisma } from '../../../config/prisma';

// Pure Node.js Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Tool 1: getDetections
 * Fetches deterministic backend detections for an actor.
 */
export const getDetectionsTool = tool(
  async ({ tenantId, actor }) => {
    const detections = await prisma.detection.findMany({
      where: { tenantId, actor },
      orderBy: { triggeredAt: 'desc' },
      take: 10
    });
    return JSON.stringify(detections);
  },
  {
    name: 'get_detections',
    description: 'Retrieves triggered backend security detections (alerts/risks) for a specific actor.',
    schema: z.object({
      tenantId: z.string().describe('The UUID of the tenant'),
      actor: z.string().describe('The email or ID of the actor to investigate'),
    }),
  }
);

/**
 * Tool 2: exactSearch
 * Standard structured lookup using Prisma.
 */
export const exactSearchTool = tool(
  async ({ tenantId, actor, action, limit }) => {
    const events = await prisma.auditEvent.findMany({
      where: {
        tenantId,
        ...(actor && { actor }),
        ...(action && { action })
      },
      orderBy: { createdAt: 'desc' },
      take: limit || 20
    });
    
    // Strip embedding to save tokens
    const cleanEvents = events.map(e => {
      // @ts-ignore
      const { embedding, ...rest } = e;
      return rest;
    });
    return JSON.stringify(cleanEvents);
  },
  {
    name: 'exact_search',
    description: 'Queries the audit log database for exact matches (e.g. all events by a specific actor or action).',
    schema: z.object({
      tenantId: z.string().describe('The UUID of the tenant'),
      actor: z.string().optional().describe('Filter by actor (email or ID)'),
      action: z.string().optional().describe('Filter by action name (e.g. LOGIN_FAILED)'),
      limit: z.number().optional().describe('Max number of events to return'),
    }),
  }
);

/**
 * Tool 3: semanticSearch (Operational RAG)
 */
export const semanticSearchTool = tool(
  async ({ tenantId, concept, limit }) => {
    const queryEmbedding = await embeddingService.generateEmbedding(concept);
    if (!queryEmbedding || queryEmbedding.length === 0) return '[]';

    const candidates = await prisma.auditEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    const scoredEvents = candidates.map(event => {
      let score = 0;
      // @ts-ignore
      if (event.embedding && event.embedding.length > 0) {
        // @ts-ignore
        score = cosineSimilarity(queryEmbedding, event.embedding);
      }
      return { event, score };
    });

    scoredEvents.sort((a, b) => b.score - a.score);

    const results = scoredEvents.slice(0, limit || 5).map(({ event, score }) => {
      // @ts-ignore
      const { embedding, ...rest } = event;
      return { ...rest, similarityScore: score };
    });
    
    return JSON.stringify(results);
  },
  {
    name: 'semantic_search',
    description: 'Performs an AI semantic search (RAG) to find events related to a fuzzy concept (e.g. "unauthorized access").',
    schema: z.object({
      tenantId: z.string().describe('The UUID of the tenant'),
      concept: z.string().describe('The natural language concept to search for'),
      limit: z.number().optional().describe('Max number of events to return'),
    }),
  }
);

/**
 * Tool 4: getTimeline
 */
export const getTimelineTool = tool(
  async ({ tenantId, actor, limit }) => {
    const events = await prisma.auditEvent.findMany({
      where: { tenantId, actor },
      orderBy: { createdAt: 'asc' },
      take: limit || 20
    });
    
    const cleanEvents = events.map(e => {
      // @ts-ignore
      const { embedding, ...rest } = e;
      return rest;
    });
    return JSON.stringify(cleanEvents);
  },
  {
    name: 'get_timeline',
    description: 'Gets chronological audit events for an actor to build a historical timeline.',
    schema: z.object({
      tenantId: z.string().describe('The UUID of the tenant'),
      actor: z.string().describe('The email or ID of the actor'),
      limit: z.number().optional().describe('Max events to return'),
    }),
  }
);

export const allTools = [getDetectionsTool, exactSearchTool, semanticSearchTool, getTimelineTool];
