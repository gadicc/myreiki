import "fake-indexeddb/auto";
import { activeClientDataOwner } from "@gadicc/loom/client-data";
import { afterEach, describe, expect, it } from "vitest";
import { PracticeDatabase } from "@/client-data/database";
import type { Snapshot } from "@/data/model";
import { parseSpreadsheet } from "@/data/spreadsheet";
import { uuidV7 } from "@/lib/uuid";

const databases: PracticeDatabase[] = [];
const create = (name = uuidV7()) => {
  const db = new PracticeDatabase(name);
  databases.push(db);
  return db;
};
const snapshot = (owner = uuidV7(), revision = 0): Snapshot => ({
  revision,
  actor: {
    _id: owner,
    displayName: "Synthetic",
    email: "person@example.test",
    image: null,
    admin: false,
    practitioner: true,
  },
  practices: [],
  clients: [],
  treatments: [],
});
async function activate(db: PracticeDatabase, source = snapshot()) {
  await db.receiveSnapshot(source, await db.beginVerification());
  return { owner: source.actor._id, revision: (await db.current()).revision };
}
afterEach(async () => {
  const names = [...new Set(databases.map((db) => db.name))];
  databases.splice(0).forEach((db) => db.close());
  for (const name of names) await new PracticeDatabase(name).delete();
});

describe("durable owner-scoped Dexie data", () => {
  it("saves a paste atomically and repeats it without duplicating clients or treatments", async () => {
    const db = create(),
      source = snapshot(),
      practiceId = uuidV7();
    source.practices.push({
      _id: practiceId,
      userId: source.actor._id,
      name: "Practice",
      version: 1,
      deletedAt: null,
    });
    const binding = await activate(db, source);
    const rows = parseSpreadsheet(
      "2026-10-21\tAki Smith Jones\t60\tself\t初回\n2026-10-22\tAki Smith Jones\t30\tregular\t",
    );
    expect(
      await db.importSpreadsheet(
        binding,
        practiceId,
        rows,
        "synthetic-fingerprint",
      ),
    ).toEqual({ imported: 2, repeated: false });
    expect(
      await db.importSpreadsheet(
        binding,
        practiceId,
        rows,
        "synthetic-fingerprint",
      ),
    ).toEqual({ imported: 0, repeated: true });
    expect(await db.pending.count()).toBe(3);
    expect(
      (await db.pending.orderBy("sequence").toArray()).map(
        (p) => p.operation.collection,
      ),
    ).toEqual(["clients", "treatments", "treatments"]);
    const otherPaste = parseSpreadsheet(
      "2026-10-23\tAnother Client\t60\tself\tnote",
    );
    const original = db.save.bind(db);
    db.save = async (...args) => {
      const result = await original(...args);
      if (args[1] === "treatments")
        throw new Error("simulated storage failure");
      return result;
    };
    await expect(
      db.importSpreadsheet(binding, practiceId, otherPaste, "failure"),
    ).rejects.toThrow("storage failure");
    expect(await db.pending.count()).toBe(3);
    expect(await db.imports.count()).toBe(1);
  });
  it("refuses stale open-form edits without overwriting a newer local edit", async () => {
    const db = create(),
      binding = await activate(db);
    const saved = await db.save(
      binding,
      "practices",
      { _id: uuidV7(), userId: binding.owner, name: "First" },
      0,
    );
    await db.save(binding, "practices", { ...saved, name: "Newer" }, 1);
    await expect(
      db.save(binding, "practices", { ...saved, name: "Stale form" }, 1),
    ).rejects.toThrow("changed while you were editing");
    expect(await db.pending.count()).toBe(2);
  });
  it("reopens indefinitely offline, fences sign-out and late responses, and recovers only the same owner's work", async () => {
    const db = create(),
      source = snapshot(),
      binding = await activate(db, source);
    const record = await db.save(binding, "practices", {
      _id: uuidV7(),
      userId: binding.owner,
      name: "My practice",
      notes: "未同期\n",
    });
    const beforeSignOut = await db.beginVerification();
    await db.signOut();
    expect(activeClientDataOwner(await db.current())).toBeNull();
    expect(await db.receiveSnapshot(source, beforeSignOut)).toBe(false);
    expect(await db.receiveSnapshot(source, await db.beginVerification())).toBe(
      false,
    );
    const second = create(db.name);
    expect(activeClientDataOwner(await second.current())).toBeNull();
    await second.beginSignIn();
    const other = snapshot();
    await activate(second, other);
    expect(
      await second.records.where("owner").equals(other.actor._id).count(),
    ).toBe(0);
    await expect(
      db.save(binding, "practices", { ...record, name: "stale callback" }),
    ).rejects.toThrow("Account changed");
    await second.signOut();
    await second.beginSignIn();
    await activate(second, source);
    expect(
      (await second.records.get([binding.owner, "practices", record._id]))
        ?.local?.notes,
    ).toBe("未同期\n");
    expect(
      await second.pending.where("owner").equals(binding.owner).count(),
    ).toBe(1);
  });
  it("orders cross-tab verifications and keeps ordinary same-owner checks from invalidating open forms", async () => {
    const db = create(),
      other = create(db.name),
      source = snapshot();
    const binding = await activate(db, source);
    const old = await db.beginVerification();
    const newest = await other.beginVerification();
    expect(await db.receiveSnapshot(snapshot(), old)).toBe(false);
    expect(await other.receiveSnapshot(source, newest)).toBe(true);
    expect((await db.current()).revision).toBe(binding.revision);
  });
  it("leases one immutable operation and rejects an old worker's acknowledgement after takeover", async () => {
    const db = create(),
      other = create(db.name),
      binding = await activate(db);
    const record = await db.save(binding, "practices", {
      _id: uuidV7(),
      userId: binding.owner,
      name: "First",
    });
    const first = await db.claim(binding, 1);
    expect(first).not.toBeNull();
    expect(await other.claim(binding, 2)).toBeNull();
    const takeover = await other.claim(binding, 60_002);
    expect(takeover?.operation).toEqual(first?.operation);
    const result = {
      ownerRevision: 1,
      operationId: first!.operation.operationId,
      collection: "practices" as const,
      record,
    };
    expect(await db.acknowledge(binding, first!, result)).toBe(false);
    expect(await other.acknowledge(binding, takeover!, result)).toBe(true);
    expect(await db.pending.count()).toBe(0);
  });
  it("preserves later optimistic edits and rejects snapshots older than an acknowledged write", async () => {
    const db = create(),
      source = snapshot(),
      binding = await activate(db, source);
    const first = await db.save(binding, "practices", {
      _id: uuidV7(),
      userId: binding.owner,
      name: "First",
    });
    const claimed = await db.claim(binding);
    const second = await db.save(binding, "practices", {
      ...first,
      name: "Second",
    });
    await db.acknowledge(binding, claimed!, {
      ownerRevision: 1,
      operationId: claimed!.operation.operationId,
      collection: "practices",
      record: first,
    });
    expect(
      (await db.records.get([binding.owner, "practices", first._id]))?.local
        ?.version,
    ).toBe(2);
    await db.receiveSnapshot(source, await db.beginVerification());
    expect(
      (await db.records.get([binding.owner, "practices", first._id]))?.local &&
        Reflect.get(
          (await db.records.get([binding.owner, "practices", first._id]))!
            .local!,
          "name",
        ),
    ).toBe("Second");
    const next = await db.claim(binding);
    expect(next?.operation.baseVersion).toBe(1);
    await db.acknowledge(binding, next!, {
      ownerRevision: 2,
      operationId: next!.operation.operationId,
      collection: "practices",
      record: second,
    });
    expect(
      (await db.records.get([binding.owner, "practices", first._id]))?.server &&
        Reflect.get(
          (await db.records.get([binding.owner, "practices", first._id]))!
            .server!,
          "name",
        ),
    ).toBe("Second");
  });
  it("retains conflicting edits until an explicit resolution creates a new operation", async () => {
    const db = create(),
      source = snapshot(),
      id = uuidV7();
    source.practices.push({
      _id: id,
      userId: source.actor._id,
      name: "Server",
      version: 1,
      deletedAt: null,
    });
    const binding = await activate(db, source);
    await db.save(binding, "practices", {
      ...source.practices[0],
      name: "Local",
    });
    const claim = await db.claim(binding);
    await db.fail(binding, claim!, "VERSION_CONFLICT", true);
    expect(await db.claim(binding)).toBeNull();
    const fresh = {
      ...source,
      revision: 1,
      practices: [
        { ...source.practices[0], name: "Remote change", version: 2 },
      ],
    };
    await db.receiveSnapshot(fresh, await db.beginVerification());
    await db.resolve(binding, claim!.sequence!, "local");
    const resolved = await db.claim(binding);
    expect(resolved?.operation.operationId).not.toBe(
      claim?.operation.operationId,
    );
    expect(resolved?.operation.baseVersion).toBe(2);
    expect(Reflect.get(resolved!.operation.record!, "name")).toBe("Local");
  });
});
