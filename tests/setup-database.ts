import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

export async function createTestSchema(prefix = 'agenthub_test') {
  const base = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!base || !/^postgres(ql)?:\/\//.test(base)) {
    throw new Error('Set TEST_DATABASE_URL to a reachable PostgreSQL database; tests use an isolated schema.');
  }
  const schema = `${prefix}_${randomUUID().replaceAll('-', '')}`;
  if (!/^[a-z0-9_]+$/.test(schema)) throw new Error('Invalid test schema name');
  const admin = new PrismaClient({ datasources: { db: { url: base } } });
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const url = new URL(base);
  url.searchParams.set('schema', schema);
  return {
    url: url.toString(), schema,
    async cleanup() {
      // Only this generated namespace is removed, never public or the database.
      try { await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await admin.$disconnect(); }
    },
  };
}

export function prismaCli(args: string[], url: string) {
  execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), ...args], {
    env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe',
  });
}

export default async function setup() {
  const database = await createTestSchema();
  process.env.DATABASE_URL = database.url;
  try {
    prismaCli(['migrate', 'deploy'], database.url);
    execFileSync(process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), 'src/database/seed.ts'], {
      env: { ...process.env, DATABASE_URL: database.url, NODE_ENV: 'test' }, stdio: 'pipe',
    });
  } catch (error) {
    await database.cleanup();
    throw error;
  }
  return () => database.cleanup();
}
