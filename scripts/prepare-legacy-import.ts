import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import superjson from "superjson";
import { fingerprintPlan, planImport } from "../src/migration/plan";
import { readSource } from "../src/migration/source";

const [sourceRoot, destination] = process.argv.slice(2);
if (
  !sourceRoot ||
  !destination ||
  !path.resolve(destination).startsWith(path.resolve(".private") + path.sep)
)
  throw new Error(
    "Usage: prepare-legacy-import <dump-directory> <new .private/plan-file>",
  );
await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
await chmod(path.dirname(destination), 0o700);
const source = await readSource(sourceRoot);
const plan = planImport(source);
const encoded = superjson.stringify(plan);
await writeFile(destination, encoded, { flag: "wx", mode: 0o600 });
if ((await readFile(destination, "utf8")) !== encoded)
  throw new Error("Saved plan verification failed");
await writeFile(
  `${destination}.receipt.json`,
  JSON.stringify(
    {
      version: 1,
      source: plan.source,
      planHash: fingerprintPlan(encoded),
      counts: {
        users: plan.users.length,
        accounts: plan.accounts.length,
        practices: plan.practices.length,
        clients: plan.clients.length,
        treatments: plan.treatments.length,
        archives: plan.archives.length,
        aliases: plan.aliases.length,
      },
    },
    null,
    2,
  ),
  { flag: "wx", mode: 0o600 },
);
console.log(
  "Protected import plan saved with stable UUIDv7 allocations; no database writes performed.",
);
console.log(
  JSON.stringify({
    users: plan.users.length,
    practices: plan.practices.length,
    clients: plan.clients.length,
    treatments: plan.treatments.length,
    retiredSessions: source.rows.filter((r) => r.collection === "sessions")
      .length,
  }),
);
