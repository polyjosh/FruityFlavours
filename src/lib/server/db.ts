import "server-only";
import { createHash } from "crypto";
import { mkdirSync, readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../../../prisma/seed-lib";

/**
 * Database access. With DATABASE_URL (Supabase) this is a normal Prisma client.
 * Without it, the app uses a local PGlite database in .data/pglite (real Postgres, stored on disk),
 * created from prisma/local-schema.sql and seeded with prisma/seed-data.ts on first use.
 * Regenerate the SQL after changing schema.prisma: `npm run db:local-schema` (the local data is then reset).
 */
export const isLocalDb = () => !process.env.DATABASE_URL;

const LOCAL_DIR = path.join(process.cwd(), ".data", "pglite");

const g = globalThis as unknown as { __ffDb?: Promise<PrismaClient> };

export function db(): Promise<PrismaClient> {
  g.__ffDb ??= (isLocalDb() ? openLocal() : Promise.resolve(new PrismaClient())).catch((e) => {
    g.__ffDb = undefined;
    throw e;
  });
  return g.__ffDb;
}

async function openLocal(): Promise<PrismaClient> {
  const [{ PGlite }, { PrismaPGlite }] = await Promise.all([import("@electric-sql/pglite"), import("pglite-prisma-adapter")]);
  mkdirSync(LOCAL_DIR, { recursive: true });
  const pg = new PGlite(LOCAL_DIR);
  await pg.waitReady;

  const sql = readFileSync(path.join(process.cwd(), "prisma", "local-schema.sql"), "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");
  await pg.exec(`CREATE TABLE IF NOT EXISTS "_local_meta" (key text PRIMARY KEY, value text NOT NULL)`);
  const current = await pg.query<{ value: string }>(`SELECT value FROM "_local_meta" WHERE key = 'schema_hash'`);
  if (current.rows[0]?.value !== hash) {
    if (current.rows.length) console.warn("[db] schema changed: resetting the local database");
    await pg.exec(`DROP SCHEMA IF EXISTS "public" CASCADE; CREATE SCHEMA "public";`);
    await pg.exec(`CREATE TABLE "_local_meta" (key text PRIMARY KEY, value text NOT NULL)`);
    await pg.exec(sql);
    await pg.query(`INSERT INTO "_local_meta" (key, value) VALUES ('schema_hash', $1)`, [hash]);
  }

  // The adapter is built against a slightly different @prisma/driver-adapter-utils typing; runtime is compatible.
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(pg) as never });
  await seedDatabase(prisma);
  return prisma;
}
