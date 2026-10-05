import { prisma } from '../config/prisma';

export const webhookRepository = {
  findByTenantId: (tenantId: string) =>
    prisma.webhookConfig.findUnique({ where: { tenantId } }),

  upsert: (tenantId: string, url: string) =>
    prisma.webhookConfig.upsert({
      where:  { tenantId },
      create: { tenantId, url, isActive: true },
      update: { url, isActive: true },
    }),

  delete: (tenantId: string) =>
    prisma.webhookConfig.deleteMany({ where: { tenantId } }),
};
