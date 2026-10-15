import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';
import { createTestSchema, prismaCli } from '../setup-database.js';

it('baselines a PostgreSQL P5 schema and preserves dealer debt during the P3 upgrade', async () => {
  const database = await createTestSchema('agenthub_upgrade');
  const client = new PrismaClient({ datasources: { db: { url: database.url } } });
  try {
    prismaCli(['db', 'execute', '--file', 'prisma/migrations/0_init/migration.sql', '--url', database.url], database.url);
    await client.$executeRaw`INSERT INTO "District" (id, code, name, "updatedAt") VALUES ('old-q', 'OLD-Q', 'Old district', CURRENT_TIMESTAMP)`;
    await client.$executeRaw`INSERT INTO "DealerTier" (id, name, "updatedAt") VALUES ('old-tier', 'Old tier', CURRENT_TIMESTAMP)`;
    await client.$executeRaw`INSERT INTO "Dealer" (id, code, name, phone, address, email, "districtId", "tierId", "currentDebt", "updatedAt")
      VALUES ('old-dealer', 'OLD-DL', 'Old dealer', '0901234567', 'Old address', 'old@example.com', 'old-q', 'old-tier', 123450, CURRENT_TIMESTAMP)`;
    prismaCli(['migrate', 'resolve', '--applied', '0_init'], database.url);
    prismaCli(['migrate', 'deploy'], database.url);
    const dealer = await client.dealer.findUniqueOrThrow({ where: { id: 'old-dealer' }, include: { district: true, tier: true } });
    expect(dealer.currentDebt).toBe(123450);
    expect(dealer.code).toBe('OLD-DL');
    expect(dealer.district.isActive).toBe(true);
    expect(dealer.tier.isActive).toBe(true);
    const triggers = await client.$queryRaw<Array<{ trigger_name: string }>>`
      SELECT trigger_name FROM information_schema.triggers
      WHERE trigger_schema = current_schema() AND trigger_name = 'Dealer_qd1_guard'`;
    expect(triggers.length).toBeGreaterThan(0);
  } finally {
    await client.$disconnect();
    await database.cleanup();
  }
});
