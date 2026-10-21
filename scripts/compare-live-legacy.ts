import { randomUUID } from "node:crypto";
import { lstat, writeFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import { collections, decodeFrames, readSource } from "../src/migration/source";

/** Read-only primary snapshot comparison; raw BSON and privileges stay in protected files. */
async function main() {
  const stat = await lstat(".private/legacy-mongo.env");
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0)
    throw new Error("Protected credential file permissions are required");
  if (!process.env.MONGO_URL)
    throw new Error("Run with the protected credential env file");
  const source = await readSource("/home/dragon/backups/myreiki/2026-10-21");
  const client = new MongoClient(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 15_000,
    readPreference: "primary",
    readConcern: { level: "majority" },
  });
  try {
    await client.connect();
    const db = client.db("myreiki");
    const names = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((r) => r.name)
      .sort();
    if (JSON.stringify(names) !== JSON.stringify([...collections].sort()))
      throw new Error("Live collection graph differs from the reviewed backup");
    const status = await db
      .admin()
      .command({ connectionStatus: 1, showPrivileges: true });
    const privileges = status.authInfo?.authenticatedUserPrivileges ?? [];
    const roles = (status.authInfo?.authenticatedUserRoles ?? []).map(
      (r: { role: string; db: string }) => ({ role: r.role, db: r.db }),
    );
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
          for (const name of collections) {
            const expected = new Map(
              source.rows
                .filter((r) => r.collection === name)
                .map((r) => [`${r.idType}:${r.id}`, r.hash]),
            );
            const rows = await db
              .collection(name)
              .find({}, { raw: true, session, maxTimeMS: 20_000 })
              .toArray();
            let matching = 0,
              different = 0;
            for (const row of rows) {
              if (!Buffer.isBuffer(row))
                throw new Error("Raw BSON comparison is unavailable");
              const decoded = decodeFrames(row, name)[0],
                key = `${decoded.idType}:${decoded.id}`;
              if (expected.get(key) === decoded.hash) matching++;
              else different++;
              expected.delete(key);
            }
            compared.push({
              collection: name,
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
    const result = {
      version: 1,
      verifiedAt: new Date().toISOString(),
      source: source.fingerprint,
      readOnly: true,
      consistentLiveRead: "snapshot transaction on primary",
      collections: compared,
      exactMatch: compared.every((r) => !r.different && !r.missing),
      roles,
      privileges,
    };
    const destination = `.private/live-source-${randomUUID()}.json`;
    await writeFile(destination, JSON.stringify(result, null, 2), {
      mode: 0o600,
      flag: "wx",
    });
    console.log(
      JSON.stringify({
        readOnly: true,
        exactMatch: result.exactMatch,
        collections: compared,
        roles,
        writerPrivilegesPresent: privileges.some((p: { actions: string[] }) =>
          p.actions.some((a) =>
            [
              "insert",
              "update",
              "remove",
              "dropCollection",
              "anyAction",
            ].includes(a),
          ),
        ),
        receipt: destination,
      }),
    );
  } finally {
    await client.close();
  }
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      status: "failed",
      name: error instanceof Error ? error.name : "unknown",
      code: typeof error?.code === "number" ? error.code : undefined,
    }),
  );
  process.exitCode = 1;
});
