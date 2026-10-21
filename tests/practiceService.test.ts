import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { user } from "@/db/schema/auth";
import { uuidV7 } from "@/lib/uuid";
import {
  applyPracticeOperation,
  readPracticeSnapshot,
} from "@/server/practiceService";
import { client, db } from "./memory-pglite";

const query = (text: string, values?: unknown[]) => client.query(text, values);
const pool = {
  connect: async () => ({ query, release() {} }),
} as unknown as Pool;
async function owner() {
  const [row] = await db
    .insert(user)
    .values({ email: `${uuidV7()}@example.test`, name: "Synthetic" })
    .returning();
  return { id: row.id, admin: false };
}
const save = (
  actorId: string,
  collection: "practices" | "clients" | "treatments",
  record: object,
  baseVersion = 0,
) => ({
  protocol: 1,
  operationId: uuidV7(),
  actorId,
  collection,
  id: Reflect.get(record, "_id"),
  baseVersion,
  kind: "save",
  record,
});

describe("SQL practice authority", () => {
  it("owns the full graph and makes uncertain retries idempotent without advancing versions twice", async () => {
    const actor = await owner(),
      other = await owner();
    const read = async () => actor;
    const id = uuidV7();
    const command = save(actor.id, "practices", {
      _id: id,
      userId: actor.id,
      name: "Practice",
      notes: "初回\r\n🌱",
    });
    const first = await applyPracticeOperation(pool, command, read);
    expect(first.record.version).toBe(1);
    expect(await applyPracticeOperation(pool, command, read)).toEqual(first);
    const ownSnapshot = await readPracticeSnapshot({ query } as never, actor);
    expect(ownSnapshot.practices.map((p) => p._id)).toContain(id);
    expect(
      (await readPracticeSnapshot({ query } as never, other)).practices,
    ).toHaveLength(0);
    await expect(
      applyPracticeOperation(
        pool,
        { ...command, record: { ...command.record, name: "changed payload" } },
        read,
      ),
    ).rejects.toMatchObject({ code: "OPERATION_REUSED" });
    const childId = uuidV7();
    await expect(
      applyPracticeOperation(
        pool,
        save(other.id, "clients", {
          _id: childId,
          practiceId: id,
          givenName: "Wrong owner",
        }),
        async () => other,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const clientRecord = await applyPracticeOperation(
      pool,
      save(actor.id, "clients", {
        _id: childId,
        practiceId: id,
        givenName: "Client",
      }),
      read,
    );
    const otherPractice = await applyPracticeOperation(
      pool,
      save(actor.id, "practices", {
        _id: uuidV7(),
        userId: actor.id,
        name: "Other practice",
      }),
      read,
    );
    await expect(
      applyPracticeOperation(
        pool,
        save(
          actor.id,
          "clients",
          { ...clientRecord.record, practiceId: otherPractice.record._id },
          1,
        ),
        read,
      ),
    ).rejects.toMatchObject({ code: "PARENT_IMMUTABLE" });
    const treatment = {
      _id: uuidV7(),
      practiceId: id,
      clientId: childId,
      practitionerId: actor.id,
      date: new Date(),
      duration: 60,
      type: "reiki",
      reiki: { type: "self" },
    };
    await expect(
      applyPracticeOperation(
        pool,
        save(actor.id, "treatments", {
          ...treatment,
          practiceId: otherPractice.record._id,
        }),
        read,
      ),
    ).rejects.toMatchObject({ code: "CLIENT_UNAVAILABLE" });
    const result = await applyPracticeOperation(
      pool,
      save(actor.id, "treatments", treatment),
      read,
    );
    expect(result.record.version).toBe(1);
    await expect(
      applyPracticeOperation(
        pool,
        save(actor.id, "treatments", { ...treatment, duration: 30 }, 0),
        read,
      ),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    const deleted = {
      protocol: 1,
      operationId: uuidV7(),
      actorId: actor.id,
      collection: "treatments",
      id: treatment._id,
      baseVersion: 1,
      kind: "delete",
    };
    expect(
      (await applyPracticeOperation(pool, deleted, read)).record.deletedAt,
    ).toBeInstanceOf(Date);
    await expect(
      applyPracticeOperation(
        pool,
        save(actor.id, "treatments", treatment, 2),
        read,
      ),
    ).rejects.toMatchObject({ code: "RECORD_DELETED" });
  });
  it("rejects forged actors and rolls back a write when the session changes before commit", async () => {
    const actor = await owner();
    const command = save(actor.id, "practices", {
      _id: uuidV7(),
      userId: actor.id,
      name: "Must roll back",
    });
    await expect(
      applyPracticeOperation(pool, command, async () => null),
    ).rejects.toMatchObject({ code: "ACCOUNT_CHANGED" });
    let reads = 0;
    await expect(
      applyPracticeOperation(pool, command, async () =>
        ++reads === 1 ? actor : null,
      ),
    ).rejects.toMatchObject({ code: "ACCOUNT_CHANGED" });
    expect(
      (await client.query("select * from practices where id=$1", [command.id]))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await client.query(
          "select * from sync_receipts where operation_id=$1",
          [command.operationId],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      applyPracticeOperation(
        pool,
        { ...command, record: { ...command.record, userId: uuidV7() } },
        async () => actor,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
