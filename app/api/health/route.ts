import { connection } from "next/server";
import { getDb } from "@/lib/db";

const REQUIRED = [
  "SESSION_SECRET",
  "DATABASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

/**
 * Deployment check: which settings are present (never their values) and whether the
 * database answers. Errors are reduced to a code so nothing sensitive is exposed.
 */
export async function GET() {
  await connection();
  const env = Object.fromEntries(REQUIRED.map((name) => [name, Boolean(process.env[name]?.trim())]));
  let db = "ok";
  try {
    await (await getDb()).query("select 1");
  } catch (err) {
    const e = err as { code?: string; message?: string };
    db = e.code ?? (e.message === "DATABASE_URL is not set" ? "missing DATABASE_URL" : "error");
  }
  const ok = Object.values(env).every(Boolean) && db === "ok";
  return Response.json({ ok, env, db }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
