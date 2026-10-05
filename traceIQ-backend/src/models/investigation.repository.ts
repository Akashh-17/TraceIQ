import { prisma } from '../config/prisma';

export type SaveInvestigationInput = {
  tenantId: string;
  query: string;
  actor?: string | null;
  summary: string;
  findings: string[];
  recommendations: string[];
};

export class InvestigationRepository {
  async save(data: SaveInvestigationInput) {
    return prisma.investigation.create({
      data: {
        tenantId:        data.tenantId,
        query:           data.query,
        actor:           data.actor ?? null,
        summary:         data.summary,
        findings:        data.findings,
        recommendations: data.recommendations,
      },
    });
  }

  async findMany(tenantId: string, limit = 20, cursor?: string) {
    return prisma.investigation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });
  }
}

export const investigationRepository = new InvestigationRepository();
