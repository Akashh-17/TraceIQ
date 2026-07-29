// prisma/seed.ts
//
// Database Seed Script — Development Only
// ========================================
// Seeds our database with two distinct tenants for testing Phase 4
// Machine-to-Machine Authentication.
//
// Run with:
//   npm run db:seed
//
// This seed is IDEMPOTENT — running it multiple times won't create duplicates.

import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

const TENANTS = [
  {
    name: 'FinStack',
    rawApiKey: 'tk_live_finstack_999',
  },
  {
    name: 'MedVault',
    rawApiKey: 'tk_live_medvault_888',
  }
];

async function seed(): Promise<void> {
  const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL'] as string,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🌱 Seeding development database...');

    for (const t of TENANTS) {
      const hashedKey = hashApiKey(t.rawApiKey);
      // upsert = insert if not exists, update if exists (idempotent)
      const tenant = await prisma.tenant.upsert({
        where:  { apiKey: hashedKey },
        update: { name: t.name },
        create: {
          name:   t.name,
          apiKey: hashedKey,
        },
      });

      console.log(`✅ Tenant ready: ${tenant.name}`);
      console.log(`   Raw API Key: ${t.rawApiKey}`);
      console.log(`   Hashed Key:  ${tenant.apiKey}`);
      console.log(`   ID:          ${tenant.id}`);
    }

    console.log('\n👤 Seeding RBAC Users for FinStack...');
    const finstackHashedKey = hashApiKey('tk_live_finstack_999');
    const finstack = await prisma.tenant.findUnique({ where: { apiKey: finstackHashedKey } });
    
    if (finstack) {
      const passwordHash = await bcrypt.hash('password123', 10);
      const seedUsers = [
        { email: 'superadmin@traceiq.io', role: Role.SUPER_ADMIN },
        { email: 'admin@finstack.com', role: Role.TENANT_ADMIN },
        { email: 'auditor@finstack.com', role: Role.AUDITOR },
        { email: 'analyst@finstack.com', role: Role.ANALYST },
        { email: 'viewer@finstack.com', role: Role.VIEWER },
      ];

      for (const u of seedUsers) {
        await prisma.user.upsert({
          where: { email: u.email },
          update: { role: u.role, password: passwordHash },
          create: {
            email: u.email,
            password: passwordHash,
            role: u.role,
            tenantId: finstack.id,
          },
        });
        console.log(`   User: ${u.email} [${u.role}] (Password: password123)`);
      }
    }

    console.log('\n✅ Database Seed Complete!');
    console.log('Use API keys for M2M, or seeded users for Dashboard API testing.');

  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((err: unknown) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
