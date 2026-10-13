import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ENV } from '../config/env.js';

const databaseUrl = process.env.DATABASE_URL ?? ENV.DATABASE_URL;
if (!databaseUrl.startsWith('file:')) throw new Error('Current Prisma schema requires a SQLite file URL');
const filename = resolve('prisma', databaseUrl.slice(5).split('?')[0]);
mkdirSync(dirname(filename), { recursive: true });
// Prisma 5's Windows migration engine needs a file to exist for a fresh SQLite DB.
if (!existsSync(filename)) closeSync(openSync(filename, 'wx'));
execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
  stdio: 'inherit', env: { ...process.env, DATABASE_URL: databaseUrl },
});
