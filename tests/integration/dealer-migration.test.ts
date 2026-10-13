import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';

it('baselines a P5 db-push database and preserves existing dealer debt during the P3 upgrade', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'agenthub-upgrade-'));
  const filename = join(directory, 'upgrade.db');
  writeFileSync(filename, '');
  const url = `file:${filename.replaceAll('\\', '/')}`;
  const cli = (args: string[]) => execFileSync(process.execPath,
    [resolve('node_modules/prisma/build/index.js'), ...args],
    { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
  cli(['db', 'execute', '--file', 'prisma/migrations/0_init/migration.sql', '--url', url]);
  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    await client.$executeRaw`INSERT INTO "District" (id, code, name, updatedAt) VALUES ('old-q', 'OLD-Q', 'Old district', CURRENT_TIMESTAMP)`;
    await client.$executeRaw`INSERT INTO "DealerTier" (id, name, updatedAt) VALUES ('old-tier', 'Old tier', CURRENT_TIMESTAMP)`;
    await client.$executeRaw`INSERT INTO "Dealer" (id, code, name, phone, address, email, districtId, tierId, currentDebt, updatedAt)
      VALUES ('old-dealer', 'OLD-DL', 'Old dealer', '0901234567', 'Old address', 'old@example.com', 'old-q', 'old-tier', 123450, CURRENT_TIMESTAMP)`;
    await client.$disconnect();
    cli(['migrate', 'resolve', '--applied', '0_init']);
    cli(['migrate', 'deploy']);
    const dealer = await client.dealer.findUniqueOrThrow({ where: { id: 'old-dealer' }, include: { district: true, tier: true } });
    expect(dealer.currentDebt).toBe(123450);
    expect(dealer.code).toBe('OLD-DL');
    expect(dealer.district.isActive).toBe(true);
    expect(dealer.tier.isActive).toBe(true);
    const triggers = await client.$queryRaw<Array<{ name: string }>>`SELECT name FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'Dealer_%'`;
    expect(triggers).toHaveLength(4);
  } finally { await client.$disconnect(); }
});
