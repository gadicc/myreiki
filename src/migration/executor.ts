import type { Client } from "pg";
import superjson from "superjson";
import { fingerprintPlan, type ImportPlan } from "./plan";

const tablePlans = [
  ["auth_user", "users"],
  ["auth_account", "accounts"],
  ["practices", "practices"],
  ["clients", "clients"],
  ["treatments", "treatments"],
  ["legacy_aliases", "aliases"],
  ["legacy_records", "archives"],
] as const;
const emptyTables = [
  "auth_session",
  "auth_verification",
  "sync_receipts",
  "practice_sync_state",
];
const allTables = [...tablePlans.map(([t]) => t), ...emptyTables];
const snake = (key: string) =>
  key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function expectedRows(
  plan: ImportPlan,
  property: (typeof tablePlans)[number][1],
) {
  return plan[property].map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [snake(key), value]),
    ),
  );
}

async function compare(sql: Pick<Client, "query">, plan: ImportPlan) {
  for (const [table, property] of tablePlans) {
    const encoded = JSON.stringify(expectedRows(plan, property));
    // Compare typed PostgreSQL values in both directions, with multiplicity.
    // Text stays byte-exact; JSONB order and timestamps use database semantics.
    const result = await sql.query<{ different: boolean }>(
      `
      with expected as (select * from jsonb_populate_recordset(null::public."${table}", $1::jsonb)),
      difference as ((select * from public."${table}" except all select * from expected)
        union all (select * from expected except all select * from public."${table}"))
      select exists(select 1 from difference) as different`,
      [encoded],
    );
    if (result.rows[0].different)
      throw new Error(`Imported table differs from saved plan: ${table}`);
  }
  for (const table of emptyTables) {
    const result = await sql.query<{ present: boolean }>(
      `select exists(select 1 from public."${table}") as present`,
    );
    if (result.rows[0].present)
      throw new Error(
        "Retired authentication sessions were unexpectedly populated",
      );
  }
}

/** Reserve one saved plan, then atomically import or verify an unchanged completed replay. */
export async function executeImport(
  sql: Pick<Client, "query">,
  input: ImportPlan,
  planHash: string,
  verifySchema?: () => Promise<void>,
) {
  // Freeze expected values before any asynchronous work.
  const plan = structuredClone(input);
  if (fingerprintPlan(superjson.stringify(plan)) !== planHash)
    throw new Error("Import payload differs from its saved fingerprint");
  if (!/^[a-f\d]{64}$/.test(planHash) || !/^[a-f\d]{64}$/.test(plan.source))
    throw new Error("Invalid import fingerprints");
  const tx = sql;
  await tx.query("begin");
  try {
    await tx.query("set local search_path = public, pg_temp");
    await tx.query(
      "insert into public.legacy_import (singleton, source_hash, plan_hash, status) values (true, $1, $2, 'prepared') on conflict (singleton) do nothing",
      [plan.source, planHash],
    );
    const {
      rows: [reservation],
    } = await tx.query(
      "select * from public.legacy_import where singleton = true for update",
    );
    if (
      reservation.source_hash !== plan.source ||
      reservation.plan_hash !== planHash
    )
      throw new Error("A different import plan is already reserved");
    await tx.query("commit");
  } catch (error) {
    await tx.query("rollback");
    throw error;
  }
  await tx.query("begin");
  try {
    await tx.query("set local search_path = public, pg_temp");
    await tx.query("set local lock_timeout = '10s'");
    await tx.query("set local statement_timeout = '60s'");
    await tx.query(
      `lock table public.legacy_import, ${allTables.map((t) => `public."${t}"`).join(", ")} in access exclusive mode`,
    );
    await verifySchema?.();
    const {
      rows: [reservation],
    } = await tx.query(
      "select * from public.legacy_import where singleton = true",
    );
    if (
      reservation.source_hash !== plan.source ||
      reservation.plan_hash !== planHash
    )
      throw new Error("Import reservation changed");
    if (reservation.status === "complete") {
      await compare(tx, plan);
      await tx.query("commit");
      return { status: "verified-replay" as const, planHash };
    }
    for (const table of allTables) {
      const result = await tx.query<{ present: boolean }>(
        `select exists(select 1 from public."${table}") as present`,
      );
      if (result.rows[0].present)
        throw new Error("Bootstrap target contains existing application rows");
    }
    for (const [table, property] of tablePlans) {
      const rows = expectedRows(plan, property);
      for (let i = 0; i < rows.length; i += 100) {
        await tx.query(
          `insert into public."${table}" select * from jsonb_populate_recordset(null::public."${table}", $1::jsonb)`,
          [JSON.stringify(rows.slice(i, i + 100))],
        );
      }
    }
    await compare(tx, plan);
    await tx.query(
      "update public.legacy_import set status = 'complete' where singleton = true",
    );
    await tx.query("commit");
    return { status: "imported" as const, planHash };
  } catch (error) {
    await tx.query("rollback");
    throw error;
  }
}
