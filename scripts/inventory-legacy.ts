import { MongoClient } from "mongodb";

/** Read schema/count metadata only; never emit documents, credentials, or raw errors. */
async function main() {
  if (!process.env.MONGO_URL) throw new Error("MONGO_URL_REQUIRED");
  const client = new MongoClient(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    readPreference: "primary",
    readConcern: { level: "majority" },
  });
  try {
    await client.connect();
    const db = client.db("myreiki");
    const names = await db.listCollections({}, { nameOnly: true }).toArray();
    const inventory = [];
    for (const { name } of names.sort((a, b) => a.name.localeCompare(b.name))) {
      const collection = db.collection(name);
      const count = await collection.countDocuments({}, { maxTimeMS: 10_000 });
      const fields = await collection
        .aggregate(
          [
            { $project: { fields: { $objectToArray: "$$ROOT" } } },
            { $unwind: "$fields" },
            {
              $group: {
                _id: { field: "$fields.k", type: { $type: "$fields.v" } },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.field": 1, "_id.type": 1 } },
          ],
          { maxTimeMS: 10_000 },
        )
        .toArray();
      const indexes = (await collection.listIndexes().toArray()).map(
        (index) => ({
          name: index.name,
          key: index.key,
          unique: index.unique === true,
        }),
      );
      inventory.push({ name, count, fields, indexes });
    }
    console.log(
      JSON.stringify(
        {
          database: "myreiki",
          snapshot: "live metadata; not a backup or cutover snapshot",
          collections: inventory,
        },
        null,
        2,
      ),
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
