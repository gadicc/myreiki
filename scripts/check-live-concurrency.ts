import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import superjson from "superjson";
import { createDatabasePool } from "../src/db/connection";
import { uuidV7 } from "../src/lib/uuid";
import { connectImportDatabase } from "../src/migration/connection";
import { executeImport } from "../src/migration/executor";
import { fingerprintPlan, type ImportPlan } from "../src/migration/plan";
import {
  applyPracticeOperation,
  ServiceError,
} from "../src/server/practiceService";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED;
  const syntheticHost =
    "ep-summer-breeze-az0jgg8u.c-3.ap-southeast-1.aws.neon.tech";
  if (!url || new URL(url).hostname !== syntheticHost)
    throw new Error(
      "Concurrency checks require the independent synthetic development root",
    );
  const pool = createDatabasePool(url),
    owner = uuidV7(),
    id = uuidV7();
  try {
    await pool.query(
      "insert into auth_user (id,name,email,admin,practitioner) values ($1,'Synthetic concurrency',$2,false,true)",
      [owner, `${owner}@example.test`],
    );
    const actor = async () => ({ id: owner, admin: false });
    const operation = {
      protocol: 1,
      operationId: uuidV7(),
      actorId: owner,
      collection: "practices",
      id,
      baseVersion: 0,
      kind: "save",
      record: {
        _id: id,
        userId: owner,
        name: "Synthetic concurrency",
        notes: "\uFEFF初回\r\n🌱\n",
      },
    };
    const [first, retry] = await Promise.all([
      applyPracticeOperation(pool, operation, actor),
      applyPracticeOperation(pool, operation, actor),
    ]);
    assert.deepEqual(first, retry);
    const results = await Promise.allSettled(
      ["A", "B"].map((notes) =>
        applyPracticeOperation(
          pool,
          {
            ...operation,
            operationId: uuidV7(),
            baseVersion: 1,
            record: { ...operation.record, notes },
          },
          actor,
        ),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const failure = results.find(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult;
    assert(
      failure.reason instanceof ServiceError &&
        failure.reason.code === "VERSION_CONFLICT",
    );
    const {
      rows: [state],
    } = await pool.query(
      "select version,(select count(*)::int from sync_receipts where owner_id=$2) as receipts from practices where id=$1",
      [id, owner],
    );
    assert.equal(Number(state.version), 2);
    assert.equal(state.receipts, 2);
    // pg's text decoder must preserve the exact source text, including its BOM.
    const text = "\uFEFF初回\r\n🌱\n";
    assert.equal(
      (await pool.query("select $1::text as value", [text])).rows[0].value,
      text,
    );
  } finally {
    // Only rows allocated by this invocation may be removed.
    await pool.query("delete from sync_receipts where owner_id=$1", [owner]);
    await pool.query("delete from practice_sync_state where owner_id=$1", [
      owner,
    ]);
    await pool.query("delete from practices where owner_id=$1", [owner]);
    await pool.query("delete from auth_user where id=$1", [owner]);
    await pool.end();
  }
  const encoded = await readFile(".private/import-plan-v1.json", "utf8"),
    plan = superjson.parse<ImportPlan>(encoded);
  const receipt = JSON.parse(
    await readFile(".private/import-plan-v1.json.receipt.json", "utf8"),
  );
  assert.equal(fingerprintPlan(encoded), receipt.planHash);
  const env = Object.fromEntries(
    (await readFile(".private/neon-migration-rehearsal.env", "utf8"))
      .trim()
      .split("\n")
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), JSON.parse(line.slice(i + 1))];
      }),
  );
  const host = "ep-raspy-forest-azru6iy8.c-3.ap-southeast-1.aws.neon.tech";
  const first = await connectImportDatabase(env.DATABASE_URL_UNPOOLED, host),
    second = await connectImportDatabase(env.DATABASE_URL_UNPOOLED, host);
  try {
    let fenced = false;
    await executeImport(first, plan, receipt.planHash, async () => {
      await second.query("begin");
      try {
        await second.query("set local lock_timeout='500ms'");
        // A zero-match update still needs a writer lock; no patient row changes.
        await second.query("update practices set name=name where false");
      } catch (error) {
        fenced = Reflect.get(error as object, "code") === "55P03";
      } finally {
        await second.query("rollback");
      }
      assert(fenced, "Import must exclude concurrent application writers");
    });
    const retries = await Promise.all([
      executeImport(first, plan, receipt.planHash),
      executeImport(second, plan, receipt.planHash),
    ]);
    assert(retries.every((r) => r.status === "verified-replay"));
  } finally {
    await first.end();
    await second.end();
  }
  const result = {
    verifiedAt: new Date().toISOString(),
    syntheticIdempotency: true,
    syntheticVersionRace: true,
    pgExactUnicode: true,
    rehearsalWriterFence: true,
    rehearsalConcurrentReplay: true,
  };
  await writeFile(
    `.private/concurrency-${randomUUID()}.json`,
    JSON.stringify(result, null, 2),
    { mode: 0o600, flag: "wx" },
  );
  console.log(JSON.stringify(result));
}
main().catch(() => {
  console.error(
    "Live concurrency check failed; inspect protected state before retrying.",
  );
  process.exitCode = 1;
});
