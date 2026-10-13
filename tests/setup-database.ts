import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Every run gets a fresh database. Never seed/reset the developer's database.
export default function setup() {
  const directory = mkdtempSync(join(tmpdir(), 'agenthub-tests-'));
  writeFileSync(join(directory, 'test.db'), '');
  process.env.DATABASE_URL = `file:${join(directory, 'test.db').replaceAll('\\', '/')}`;
  const options = { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test' }, stdio: 'pipe' as const };
  execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], options);
  execFileSync(process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), 'src/database/seed.ts'], options);
}
