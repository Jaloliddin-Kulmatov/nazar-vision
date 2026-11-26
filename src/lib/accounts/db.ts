import postgres from "postgres";

/**
 * Sign-ups live in the Postgres database named by DATABASE_URL (any Postgres:
 * Supabase, Neon, Vercel Postgres…). Tables are created on first use, in their own
 * schema so Supabase's public API never exposes them.
 */
export const databaseUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
export const accountsEnabled = () => Boolean(databaseUrl());

let client: postgres.Sql | null = null;
let ready: Promise<void> | null = null;

function sql(): postgres.Sql {
  if (!client) {
    const url = databaseUrl();
    const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
    client = postgres(url, {
      // Works with Supabase's transaction pooler (port 6543), which can't use prepared statements.
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: local ? false : "require",
    });
  }
  return client;
}

async function migrate(db: postgres.Sql) {
  await db.unsafe(`
    create schema if not exists nazar_vision;
    create table if not exists nazar_vision.signups (
      id uuid primary key default gen_random_uuid(),
      email text not null unique,
      name text not null,
      company text not null default '',
      created_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now()
    );
    create table if not exists nazar_vision.code_downloads (
      id bigint generated always as identity primary key,
      signup_id uuid not null references nazar_vision.signups (id) on delete cascade,
      kit text not null,
      created_at timestamptz not null default now()
    );
    create index if not exists code_downloads_signup_idx on nazar_vision.code_downloads (signup_id);
  `);
  // On Supabase, keep the API roles out even if someone exposes the schema later.
  await db.unsafe(`
    do $$ begin
      if exists (select 1 from pg_roles where rolname = 'anon') then
        revoke all on schema nazar_vision from anon, authenticated;
      end if;
    end $$;
  `);
}

/** The ready-to-use connection, with the tables in place. */
export async function db(): Promise<postgres.Sql> {
  const s = sql();
  ready ??= migrate(s).catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return s;
}

/** Creates the sign-up, or refreshes name and company if the email signed up before. */
export async function upsertSignup(d: { name: string; email: string; company: string }): Promise<{ id: string; isNew: boolean }> {
  const s = await db();
  const [row] = await s<{ id: string; is_new: boolean }[]>`
    insert into nazar_vision.signups (email, name, company)
    values (${d.email}, ${d.name}, ${d.company})
    on conflict (email) do update set name = excluded.name,
      company = case when excluded.company = '' then nazar_vision.signups.company else excluded.company end,
      last_seen_at = now()
    returning id, (xmax = 0) as is_new`;
  return { id: row.id, isNew: row.is_new };
}

export async function logDownload(signupId: string, kit: string) {
  const s = await db();
  await s`insert into nazar_vision.code_downloads (signup_id, kit) values (${signupId}, ${kit})`;
  await s`update nazar_vision.signups set last_seen_at = now() where id = ${signupId}`;
}

/** True for errors that mean "the database can't be reached", not "the query was wrong". */
export function isUnreachable(e: unknown): boolean {
  const code = (e as { code?: string })?.code ?? "";
  return ["ENOTFOUND", "ENETUNREACH", "EHOSTUNREACH", "ECONNREFUSED", "ETIMEDOUT", "CONNECT_TIMEOUT", "EAI_AGAIN"].includes(code);
}
