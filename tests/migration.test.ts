import { BSON } from "mongodb";
import type { Client } from "pg";
import superjson from "superjson";
import { describe, expect, it } from "vitest";
import { uuidV7 } from "@/lib/uuid";
import { executeImport } from "@/migration/executor";
import { fingerprintPlan, planImport } from "@/migration/plan";
import { sourceFromSavedPlan } from "@/migration/savedSource";
import { decodeFrames, digest, type Source } from "@/migration/source";
import { client } from "./memory-pglite";

function fixture(): Source {
  const uid = new BSON.ObjectId(),
    pid = new BSON.ObjectId(),
    cid = new BSON.ObjectId();
  const date = new Date("2023-06-17T11:12:13.987Z");
  const docs = {
    users: [
      {
        _id: uid,
        name: "秋",
        displayName: "秋",
        email: "owner@example.test",
        emailVerified: null,
        emails: [{ value: "owner@example.test", verified: true }],
        services: [
          {
            service: "google",
            id: "subject-1",
            profile: { _json: { sub: "subject-1" } },
          },
        ],
        createdAt: date,
        practitioner: true,
      },
    ],
    accounts: [
      {
        _id: new BSON.ObjectId(),
        provider: "google",
        type: "oauth",
        providerAccountId: "subject-1",
        userId: uid,
        access_token: "retired-secret",
      },
    ],
    practices: [
      { _id: pid, userId: uid, name: "Practice", notes: "\uFEFF初回\r\n🌱\n" },
    ],
    clients: [{ _id: cid, practiceId: pid, givenName: "Aki", notes: "" }],
    treatments: [
      {
        _id: "old-string-id",
        clientId: cid.toHexString(),
        practiceId: pid,
        practitionerId: uid,
        date,
        duration: 60,
        type: "reiki",
        reiki: { type: "self" },
        notes: "\r\n",
      },
    ],
    sessions: [{ _id: new BSON.ObjectId(), sessionToken: "old-session" }],
    verification_tokens: [],
  };
  const rows = Object.entries(docs).flatMap(([collection, docs]) =>
    decodeFrames(
      Buffer.concat(docs.map((d) => BSON.serialize(d))),
      collection as "users",
    ),
  );
  return { fingerprint: digest("synthetic-only"), files: [], rows };
}

describe("Mongo import planning", () => {
  it("imports atomically, verifies exact retries, and refuses changed targets or plans", async () => {
    const plan = planImport(fixture());
    const hash = fingerprintPlan(superjson.stringify(plan));
    const connection = {
      query: (sql: string, args?: unknown[]) => client.query(sql, args),
    } as unknown as Client;
    expect((await executeImport(connection, plan, hash)).status).toBe(
      "imported",
    );
    expect((await executeImport(connection, plan, hash)).status).toBe(
      "verified-replay",
    );
    await client.query("update clients set notes = 'newer work'");
    await expect(executeImport(connection, plan, hash)).rejects.toThrow(
      "differs",
    );
    expect(
      (await client.query<{ notes: string }>("select notes from clients"))
        .rows[0].notes,
    ).toBe("newer work");
    const other = planImport(fixture());
    await expect(
      executeImport(
        connection,
        other,
        fingerprintPlan(superjson.stringify(other)),
      ),
    ).rejects.toThrow("different import plan");
    await client.query(
      "truncate auth_account, auth_user, practices, clients, treatments, legacy_records, legacy_aliases, legacy_import cascade",
    );
    const broken = structuredClone(plan);
    broken.treatments[0].duration = 0;
    const brokenHash = fingerprintPlan(superjson.stringify(broken));
    await expect(
      executeImport(connection, broken, brokenHash),
    ).rejects.toThrow();
    expect((await client.query("select * from auth_user")).rows).toHaveLength(
      0,
    );
    expect(
      (
        await client.query<{ status: string }>(
          "select status from legacy_import",
        )
      ).rows[0].status,
    ).toBe("prepared");
    await expect(executeImport(connection, plan, hash)).rejects.toThrow(
      "different import plan",
    );
  });
  it("binds exact typed archives, preserves text/dates, remaps links, and retires sessions/tokens", () => {
    const source = fixture(),
      plan = planImport(source);
    expect(plan.users).toHaveLength(1);
    expect(plan.practices[0].notes).toBe("\uFEFF初回\r\n🌱\n");
    expect(plan.clients[0].notes).toBe("");
    expect(plan.treatments[0].clientId).toBe(plan.clients[0].id);
    expect(plan.treatments[0].date).toEqual(
      new Date("2023-06-17T11:12:13.987Z"),
    );
    expect(plan.accounts[0].accessToken).toBeNull();
    expect(
      plan.archives.find((a) => a.collection === "sessions")?.disposition,
    ).toBe("retired-auth");
    expect(plan.aliases.some((a) => a.collection === "sessions")).toBe(false);
    expect(superjson.parse(superjson.stringify(plan))).toEqual(plan);
    const resumed = sourceFromSavedPlan(
      superjson.parse(superjson.stringify(plan)),
    );
    expect(resumed.fingerprint).toBe(source.fingerprint);
    expect(
      resumed.rows.map(({ collection, idType, id, hash }) => ({
        collection,
        idType,
        id,
        hash,
      })),
    ).toEqual(
      source.rows.map(({ collection, idType, id, hash }) => ({
        collection,
        idType,
        id,
        hash,
      })),
    );
    expect(
      plan.archives.find((a) => a.collection === "treatments")?.ejson,
    ).toHaveProperty("date.$date.$numberLong");
  });
  it("refuses invalid/truncated BSON and duplicate typed identities", () => {
    expect(() => decodeFrames(Buffer.from([7, 0, 0, 0, 0]), "users")).toThrow();
    const frame = BSON.serialize({ _id: "x" });
    expect(() => decodeFrames(Buffer.concat([frame, frame]), "users")).toThrow(
      "Duplicate",
    );
  });
  it("keeps string and ObjectId entity keys distinct and refuses ambiguous hex references", () => {
    const source = fixture();
    const client = source.rows.find((r) => r.collection === "clients")!;
    const [other] = decodeFrames(
      BSON.serialize({ ...client.document, _id: client.id }),
      "clients",
    );
    source.rows.push(other);
    expect(() => planImport(source)).toThrow("Ambiguous");
  });
  it("refuses missing parents, cross-practice attribution and provider identity disagreement", () => {
    const source = fixture();
    source.rows.find((r) => r.collection === "treatments")!.document.clientId =
      "missing";
    expect(() => planImport(source)).toThrow("Unresolved");
    const source2 = fixture();
    source2.rows.find(
      (r) => r.collection === "accounts",
    )!.document.providerAccountId = "different-subject";
    expect(() => planImport(source2)).toThrow("provider identity");
    const source3 = fixture();
    source3.rows.find((r) => r.collection === "treatments")!.document.duration =
      -1;
    expect(() => planImport(source3)).toThrow("duration");
  });
  it("checks body-point parent identity before rebinding it", () => {
    const source = fixture();
    const treatment = source.rows.find((r) => r.collection === "treatments")!;
    const point = {
      _id: "old-point",
      treatmentId: treatment.document._id,
      x: 0.5,
      y: 0.25,
      size: 2,
      level: 3,
    };
    treatment.document.bodyPoints = { front: [point], back: [] };
    const plan = planImport(source);
    expect(plan.treatments[0].bodyPoints?.front[0].treatmentId).toBe(
      plan.treatments[0].id,
    );
    point.treatmentId = "another-treatment";
    expect(() => planImport(source)).toThrow("Unresolved");
  });
  it("snapshots caller data before an allocation callback", () => {
    const source = fixture();
    const plan = planImport(source, () => {
      source.rows[0].document.name = "changed";
      return uuidV7();
    });
    expect(plan.users[0].name).toBe("秋");
    expect(() =>
      planImport(fixture(), () => "00000000-0000-4000-8000-000000000000"),
    ).toThrow("UUIDv7");
  });
});
