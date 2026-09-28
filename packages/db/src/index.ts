import { fileURLToPath } from 'node:url';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema.js';

export * as schema from './schema.js';
export * from './repo.js';

export type Db = PostgresJsDatabase<typeof schema>;

const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url));

export interface DbHandle {
  db: Db;
  close: () => Promise<void>;
}

/**
 * Connects to Postgres (Neon or any other). `prepare: false` keeps it compatible with
 * transaction-mode poolers such as Neon's pooled endpoint / PgBouncer.
 */
export function connect(url: string): DbHandle {
  const client = postgres(cleanUrl(url), { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 15, onnotice: () => {} });
  return { db: drizzle(client, { schema }), close: () => client.end({ timeout: 5 }) };
}

/** libpq-only options (Neon puts channel_binding in its connection strings) are not server parameters for postgres.js. */
function cleanUrl(url: string): string {
  const u = new URL(url);
  u.searchParams.delete('channel_binding');
  return u.toString();
}

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS });
}
