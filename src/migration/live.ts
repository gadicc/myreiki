import type { MongoClient } from "mongodb";
import { collections, decodeFrames, type Source } from "./source";

/** Compare one consistent primary read with the reviewed raw BSON; emit no documents. */
export async function inspectLiveSource(client: MongoClient, source: Source) {
  const db = client.db("myreiki");
  const names = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((r) => r.name)
    .sort();
  if (JSON.stringify(names) !== JSON.stringify([...collections].sort()))
    throw new Error("Live collection graph changed");
  const status = await db
    .admin()
    .command({ connectionStatus: 1, showPrivileges: true });
  const roles: Array<{ role: string; db: string }> = (
    status.authInfo?.authenticatedUserRoles ?? []
  ).map((r: { role: string; db: string }) => ({ role: r.role, db: r.db }));
  const privileges: Array<{ actions: string[] }> =
    status.authInfo?.authenticatedUserPrivileges ?? [];
  const session = client.startSession(),
    compared: Array<{
      collection: string;
      count: number;
      matching: number;
      different: number;
      missing: number;
    }> = [];
  try {
    await session.withTransaction(
      async () => {
        compared.length = 0;
        for (const collection of collections) {
          const expected = new Map(
            source.rows
              .filter((r) => r.collection === collection)
              .map((r) => [`${r.idType}:${r.id}`, r.hash]),
          );
          const rows = await db
            .collection(collection)
            .find({}, { raw: true, session, maxTimeMS: 20_000 })
            .toArray();
          let matching = 0,
            different = 0;
          for (const row of rows) {
            if (!Buffer.isBuffer(row))
              throw new Error("Raw BSON comparison is unavailable");
            const decoded = decodeFrames(row, collection)[0],
              key = `${decoded.idType}:${decoded.id}`;
            if (expected.get(key) === decoded.hash) matching++;
            else different++;
            expected.delete(key);
          }
          compared.push({
            collection,
            count: rows.length,
            matching,
            different,
            missing: expected.size,
          });
        }
      },
      {
        readConcern: { level: "snapshot" },
        readPreference: "primary",
        maxCommitTimeMS: 20_000,
      },
    );
  } finally {
    await session.endSession();
  }
  const readOnly =
    roles.length === 1 &&
    ((roles[0].role === "read" && roles[0].db === "myreiki") ||
      (roles[0].role === "readAnyDatabase" && roles[0].db === "admin")) &&
    privileges.length > 0 &&
    privileges.every((p) =>
      p.actions.every((action) =>
        [
          "changeStream",
          "collStats",
          "dbHash",
          "dbStats",
          "find",
          "killCursors",
          "listCollections",
          "listIndexes",
          "listSearchIndexes",
          "planCacheRead",
        ].includes(action),
      ),
    );
  return {
    collections: compared,
    exactMatch: compared.every((r) => !r.different && !r.missing),
    roles,
    readOnly,
  };
}

/** An impossible-ID, non-upserting write must be rejected, rather than merely match zero rows. */
export async function verifyLegacyWriterFence(client: MongoClient) {
  try {
    await client
      .db("myreiki")
      .collection("practices")
      .updateOne(
        { _id: { $exists: false } },
        { $set: { __myreiki_fence_probe: 1 } },
        { upsert: false },
      );
    throw new Error("Legacy credential still accepts writes");
  } catch (error) {
    const code = Reflect.get(error as object, "code"),
      name = Reflect.get(error as object, "codeName");
    const denial =
      error instanceof Error &&
      /(not authorized|not allowed.*(?:update|action)|unauthorized)/i.test(
        error.message,
      );
    if (!((code === 13 || code === 8000) && denial))
      throw new Error("Legacy write denial was not verified");
    return {
      denied: true,
      code,
      codeName: typeof name === "string" ? name : undefined,
    };
  }
}
