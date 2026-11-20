/**
 * Postgres access for live mode.
 *
 * DATABASE_URL (or POSTGRES_URL, which the Vercel/Neon integration sets) points at the database.
 * For testing on this computer without a server, DATABASE_URL=pglite://<folder> runs an
 * embedded Postgres (PGlite) instead.
 *
 * Data model: one `records` table holds every collection the app uses (users, properties, snags…)
 * as JSON documents, keyed by (collection, id). Photos and sign-in tokens have their own tables.
 * The tables are created automatically on first use.
 */
import "server-only";

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Run several statements atomically. */
  begin<T>(fn: (tx: Pick<Db, "query">) => Promise<T>): Promise<T>;
}

const SCHEMA = [
  `create table if not exists records (
     collection text not null,
     id text not null,
     seq bigserial,
     property_id text,
     data jsonb not null,
     updated_at timestamptz not null default now(),
     primary key (collection, id)
   )`,
  `create index if not exists records_property_idx on records (property_id)`,
  `create table if not exists photos (
     id text primary key,
     content_type text not null,
     data bytea not null,
     property_id text,
     created_at timestamptz not null default now()
   )`,
  `create table if not exists login_tokens (
     token_hash text primary key,
     user_id text not null,
     next_path text,
     expires_at timestamptz not null,
     used_at timestamptz,
     created_at timestamptz not null default now()
   )`,
];

export const databaseUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
export const hasDatabase = () => !!databaseUrl();

let dbPromise: Promise<Db> | null = null;

/** The shared database connection, with the schema in place. */
export function getDb(): Promise<Db> {
  dbPromise ??= connect().catch((e) => {
    dbPromise = null; // allow a retry on the next request
    throw e;
  });
  return dbPromise;
}

async function connect(): Promise<Db> {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = url.startsWith("pglite://") ? await pgliteDb(url.slice("pglite://".length)) : await postgresDb(url);
  for (const statement of SCHEMA) await db.query(statement);
  return db;
}

async function postgresDb(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  // prepare:false keeps it compatible with pooled (PgBouncer) connection strings such as Neon's.
  const sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20, onnotice: () => {} });
  type Runner = { unsafe: (text: string, params?: never[]) => Promise<unknown> };
  const wrap = (runner: Runner): Pick<Db, "query"> => ({
    query: async <T,>(text: string, params: unknown[] = []) => (await runner.unsafe(text, params as never[])) as T[],
  });
  return {
    ...wrap(sql as unknown as Runner),
    begin: async <T,>(fn: (tx: Pick<Db, "query">) => Promise<T>) => (await sql.begin((tx) => fn(wrap(tx as unknown as Runner)))) as T,
  };
}

async function pgliteDb(dir: string): Promise<Db> {
  // Local testing only. Loaded by name at runtime so it never ends up in the production bundle.
  const mod = "@electric-sql/pglite";
  const { PGlite } = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ mod)) as typeof import("@electric-sql/pglite");
  const pg = new PGlite(dir || undefined);
  const q = async <T,>(text: string, params: unknown[] = [], runner: { query: typeof pg.query } = pg) =>
    (await runner.query<T>(text, params)).rows;
  return {
    query: (text, params) => q(text, params),
    begin: (fn) => pg.transaction((tx) => fn({ query: (text, params) => q(text, params, tx) })),
  };
}
