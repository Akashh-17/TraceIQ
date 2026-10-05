// src/models/tenant.repository.ts
//
// TenantRepository — Data Access Layer for Tenant
// ================================================
// All Prisma calls touching the `tenants` table live here.
//
// The most important method right now is findByApiKey —
// it powers authentication in Phase 4. When a request comes in
// with an API key header, this method finds the owning tenant.
//
// Current status: STUB — scaffolded for Phase 4 (Authentication).

import { prisma } from '../config/prisma';
import { Tenant } from '@prisma/client';
import { hashApiKey } from '../utils/hash.utils';

export class TenantRepository {

  // FIND BY API KEY — the core authentication lookup
  //
  // Called by: AuthMiddleware (Phase 4)
  // Given a raw API key from the request header, hash it and find the tenant.
  // Returns null if the key doesn't match any tenant → 401 Unauthorized.
  async findByApiKey(apiKey: string): Promise<Tenant | null> {
    const hashedKey = hashApiKey(apiKey);
    return prisma.tenant.findUnique({ where: { apiKey: hashedKey } });
  }

  // FIND BY ID — get a tenant by their primary key
  //
  // Used internally when we have a tenantId and need full tenant details.
  async findById(id: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({ where: { id } });
  }

  // CREATE — register a new tenant
  //
  // Used by: Admin API / onboarding flow (Phase 5+)
  async create(data: { name: string; apiKey: string }): Promise<Tenant> {
    const hashedKey = hashApiKey(data.apiKey);
    return prisma.tenant.create({
      data: {
        ...data,
        apiKey: hashedKey,
      },
    });
  }
}

// Singleton instance
export const tenantRepository = new TenantRepository();
