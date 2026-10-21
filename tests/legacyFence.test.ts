import { BSON, type MongoClient } from "mongodb";
import { expect, it } from "vitest";
import { inspectLiveSource, verifyLegacyWriterFence } from "@/migration/live";
import {
  collections,
  decodeFrames,
  digest,
  type Source,
} from "@/migration/source";

function fixture(
  role = "read",
  actions = ["find", "listSearchIndexes"],
  deny: unknown = {
    code: 13,
    codeName: "Unauthorized",
    message: "not authorized to update",
  },
) {
  const bytes = BSON.serialize({ _id: "old-practice", name: "Synthetic" });
  const source: Source = {
    fingerprint: digest("synthetic"),
    files: [],
    rows: decodeFrames(bytes, "practices"),
  };
  const client = {
    db: () => ({
      listCollections: () => ({
        toArray: async () => collections.map((name) => ({ name })),
      }),
      admin: () => ({
        command: async () => ({
          authInfo: {
            authenticatedUserRoles: [
              { role, db: role === "read" ? "myreiki" : "admin" },
            ],
            authenticatedUserPrivileges: [{ actions }],
          },
        }),
      }),
      collection: (name: string) => ({
        find: () => ({
          toArray: async () => (name === "practices" ? [bytes] : []),
        }),
        updateOne: async () => {
          if (deny)
            throw Object.assign(
              new Error(Reflect.get(deny as object, "message")),
              deny,
            );
          return { matchedCount: 0 };
        },
      }),
    }),
    startSession: () => ({
      withTransaction: async (action: () => Promise<void>) => await action(),
      endSession: async () => {},
    }),
  } as unknown as MongoClient;
  return { source, client };
}
it("recognizes only the dedicated built-in read role with bounded read actions", async () => {
  const { source, client } = fixture();
  expect(await inspectLiveSource(client, source)).toMatchObject({
    exactMatch: true,
    readOnly: true,
  });
  for (const [role, actions] of [
    ["atlasAdmin", ["find"]],
    ["read", ["find", "update"]],
  ] as const) {
    const other = fixture(role, [...actions]);
    expect((await inspectLiveSource(other.client, other.source)).readOnly).toBe(
      false,
    );
  }
  const changed = structuredClone(source);
  changed.rows[0].hash = digest("changed");
  expect((await inspectLiveSource(client, changed)).exactMatch).toBe(false);
});
it("requires semantic authorization denial, including Atlas-wrapped errors", async () => {
  expect(await verifyLegacyWriterFence(fixture().client)).toMatchObject({
    denied: true,
    code: 13,
  });
  expect(
    await verifyLegacyWriterFence(
      fixture("read", ["find"], {
        code: 8000,
        codeName: "AtlasError",
        message: "user is not allowed to do action [update]",
      }).client,
    ),
  ).toMatchObject({ denied: true, code: 8000 });
  await expect(
    verifyLegacyWriterFence(
      fixture("read", ["find"], { code: 8000, message: "capacity exceeded" })
        .client,
    ),
  ).rejects.toThrow();
  await expect(
    verifyLegacyWriterFence(fixture("read", ["find"], null).client),
  ).rejects.toThrow();
});
