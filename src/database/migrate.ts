import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ENV } from '../config/env.js';

const databaseUrl = process.env.DATABASE_URL ?? ENV.DATABASE_URL;
if (!/^postgres(ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL must use PostgreSQL');
execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
  stdio: 'inherit', env: { ...process.env, DATABASE_URL: databaseUrl },
});
