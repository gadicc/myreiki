import { pool } from "@/db/runtime";

/** A staged Production build cannot become a writer before the reviewed bootstrap import. */
export async function isDatabaseActivated() {
  if (process.env.VERCEL_ENV !== "production") return true;
  const expected = process.env.MYREIKI_IMPORT_PLAN_SHA256;
  if (!expected || !/^[a-f\d]{64}$/.test(expected)) return false;
  try {
    const {
      rows: [receipt],
    } = await pool.query(
      "select plan_hash,status from public.legacy_import where singleton=true",
    );
    return receipt?.status === "complete" && receipt.plan_hash === expected;
  } catch {
    return false;
  }
}

export const unavailable = () =>
  Response.json(
    { error: "MIGRATION_PENDING" },
    {
      status: 503,
      headers: { "Cache-Control": "private,no-store", "Retry-After": "60" },
    },
  );
