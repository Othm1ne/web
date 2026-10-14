// Database access behind a one-method interface. With DATABASE_URL set (e.g. Supabase's
// free tier) it talks to hosted Postgres; without it, an embedded PGlite Postgres keeps
// data in data/pglite so local development needs no install or account.
import path from "node:path";
import { SCHEMA } from "./schema";

export type Db = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    // prepare: false keeps it compatible with transaction-mode poolers (Supabase port 6543).
    const sql = postgres(url, { prepare: false, max: 5 });
    return {
      query: async <T>(text: string, params: unknown[] = []) =>
        (await sql.unsafe(text, params as never[])) as unknown as T[],
    };
  }
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_EMBEDDED_DB) {
    throw new Error("DATABASE_URL is not set");
  }
  return pglite(path.join(process.cwd(), "data", "pglite"));
}

/** An embedded Postgres; pass no directory for a throwaway in-memory database (tests). */
export async function pglite(dir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(dir);
  return { query: async <T>(text: string, params: unknown[] = []) => (await pg.query<T>(text, params)).rows };
}

export async function migrate(db: Db) {
  for (const statement of SCHEMA) await db.query(statement);
}

const holder = globalThis as unknown as { __db?: Promise<Db>; __migration?: { statements: number; done: Promise<void> } };

export async function getDb(): Promise<Db> {
  holder.__db ??= connect().catch((err) => {
    holder.__db = undefined;
    throw err;
  });
  const db = await holder.__db;
  // The connection outlives code reloads in development, so re-apply the schema whenever it
  // has grown (statements are idempotent) instead of only on the first connection.
  if (holder.__migration?.statements !== SCHEMA.length) {
    const done = migrate(db).catch((err) => {
      holder.__migration = undefined;
      throw err;
    });
    holder.__migration = { statements: SCHEMA.length, done };
  }
  await holder.__migration!.done;
  return db;
}
