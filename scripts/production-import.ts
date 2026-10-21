import { randomUUID } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { MongoClient } from "mongodb";
import superjson from "superjson";
import { checkoutArtifact } from "../src/migration/artifact";
import { catalogFingerprint } from "../src/migration/catalog";
import { connectImportDatabase } from "../src/migration/connection";
import { executeImport } from "../src/migration/executor";
import {
  inspectLiveSource,
  verifyLegacyWriterFence,
} from "../src/migration/live";
import { fingerprintPlan, type ImportPlan } from "../src/migration/plan";
import { sourceFromSavedPlan } from "../src/migration/savedSource";
import { digest, readSource } from "../src/migration/source";

const project = "spring-silence-76514204",
  branch = "br-orange-waterfall-az9wxp6q";
const proposalFile = ".private/production-import-proposal.json";
class ImportGuardError extends Error {}
let phase = "input-verification";
async function privateFile(path: string) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077)
    throw new ImportGuardError("Protected file permissions required");
  return await readFile(path, "utf8");
}
async function main() {
  const [mode, approval] = process.argv.slice(2);
  if (!["prepare", "apply", "resume"].includes(mode))
    throw new ImportGuardError(
      "Use prepare|apply|resume <reviewed-proposal-sha256>",
    );
  const encoded = await privateFile(".private/import-plan-v1.json"),
    plan = superjson.parse<ImportPlan>(encoded);
  const receipt = JSON.parse(
    await privateFile(".private/import-plan-v1.json.receipt.json"),
  );
  if (plan.version !== 1 || fingerprintPlan(encoded) !== receipt.planHash)
    throw new ImportGuardError("Saved plan fingerprint changed");
  const source =
    mode === "resume"
      ? sourceFromSavedPlan(plan)
      : await readSource("/home/dragon/backups/myreiki/2026-10-21");
  if (
    source.fingerprint !== plan.source ||
    JSON.stringify(source.files) !== JSON.stringify(plan.files)
  )
    throw new ImportGuardError("Reviewed plan or source changed");
  const env = parseEnv(await privateFile(".private/neon-production.env"));
  if (!env.DATABASE_URL_UNPOOLED)
    throw new ImportGuardError("Production URL missing");
  const url = new URL(env.DATABASE_URL_UNPOOLED),
    host = url.hostname;
  const credentials = JSON.parse(
    await privateFile("/home/dragon/.config/neon/credentials.json"),
  );
  const request = async (path: string) => {
    const r = await fetch(`https://console.neon.tech/api/v2${path}`, {
      headers: { Authorization: `Bearer ${credentials.access_token}` },
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) throw new ImportGuardError("Neon target verification failed");
    return await r.json();
  };
  phase = "provider-target-verification";
  const metadata = await request(`/projects/${project}`),
    endpoints = await request(`/projects/${project}/endpoints`);
  if (
    metadata.project.id !== project ||
    metadata.project.region_id !== "aws-ap-southeast-1" ||
    !endpoints.endpoints.some(
      (e: { branch_id: string; host: string; type: string }) =>
        e.branch_id === branch && e.host === host && e.type === "read_write",
    )
  )
    throw new ImportGuardError("Production endpoint binding changed");
  const dev = parseEnv(
    await privateFile(".private/neon-development-synthetic.env"),
  );
  if (!dev.DATABASE_URL_UNPOOLED)
    throw new ImportGuardError("Synthetic baseline URL missing");
  let targetConnection:
    | Awaited<ReturnType<typeof connectImportDatabase>>
    | undefined;
  let baselineConnection:
    | Awaited<ReturnType<typeof connectImportDatabase>>
    | undefined;
  const mongoEnv = parseEnv(await privateFile(".private/legacy-mongo.env"));
  if (!mongoEnv.MONGO_URL)
    throw new ImportGuardError("Legacy source credential required");
  const mongoUrl = new URL(mongoEnv.MONGO_URL);
  let mongo = new MongoClient(mongoEnv.MONGO_URL, {
    readPreference: "primary",
    readConcern: { level: "majority" },
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 15_000,
  });
  try {
    phase = "database-target-verification";
    const target = (targetConnection = await connectImportDatabase(
      env.DATABASE_URL_UNPOOLED,
      host,
    ));
    const baseline = (baselineConnection = await connectImportDatabase(
      dev.DATABASE_URL_UNPOOLED,
      "ep-summer-breeze-az0jgg8u.c-3.ap-southeast-1.aws.neon.tech",
    ));
    phase = "live-source-comparison";
    await mongo.connect();
    const live = await inspectLiveSource(mongo, source);
    if (!live.exactMatch)
      throw new ImportGuardError("Live source differs from reviewed backup");
    const catalog = await catalogFingerprint(baseline),
      artifact = await checkoutArtifact();
    const {
      rows: [schemaState],
    } = await target.query(
      "select to_regclass('public.legacy_import') as checkpoint",
    );
    if (schemaState.checkpoint) {
      if ((await catalogFingerprint(target)) !== catalog)
        throw new ImportGuardError(
          "Existing Production schema differs from the reviewed baseline",
        );
    } else {
      const {
        rows: [tables],
      } = await target.query(
        "select count(*)::int as count from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')",
      );
      if (tables.count !== 0)
        throw new ImportGuardError(
          "Unexpected Production tables before bootstrap",
        );
    }
    if (mode === "resume") {
      if (!schemaState.checkpoint)
        throw new ImportGuardError(
          "A database checkpoint is required for source-free resume",
        );
      const {
        rows: [checkpoint],
      } = await target.query(
        "select source_hash,plan_hash from legacy_import where singleton=true",
      );
      if (
        checkpoint?.source_hash !== plan.source ||
        checkpoint.plan_hash !== receipt.planHash
      )
        throw new ImportGuardError(
          "Resume checkpoint differs from the reviewed plan",
        );
    }
    const proposal = {
      version: 1,
      planHash: receipt.planHash,
      source: source.fingerprint,
      artifact: artifact.hash,
      catalog,
      target: {
        project,
        branch,
        host,
        database: decodeURIComponent(url.pathname.slice(1)),
        role: decodeURIComponent(url.username),
      },
      legacyPrincipal: digest(`${mongoUrl.hostname}/${mongoUrl.username}`),
    };
    if (mode === "prepare") {
      const bytes = JSON.stringify(proposal, null, 2) + "\n";
      await writeFile(proposalFile, bytes, { mode: 0o600, flag: "wx" });
      console.log(
        JSON.stringify({
          prepared: true,
          proposal: proposalFile,
          approvalSha256: digest(bytes),
          sourceMatches: true,
          legacyReadOnly: live.readOnly,
          productionSqlWrites: false,
        }),
      );
      return;
    }
    phase = "proposal-approval";
    const reviewed = await privateFile(proposalFile);
    if (
      digest(reviewed) !== approval ||
      JSON.stringify(JSON.parse(reviewed)) !== JSON.stringify(proposal)
    )
      throw new ImportGuardError(
        "Production proposal approval or frozen inputs changed",
      );
    phase = "legacy-writer-fence";
    if (!live.readOnly)
      throw new ImportGuardError(
        "Dedicated legacy account must have only its approved read role",
      );
    const denial = await verifyLegacyWriterFence(mongo);
    // Drain ordinary in-flight legacy requests, then use a new authenticated connection.
    console.log(
      "Legacy write denial verified. Waiting 60 seconds before the final consistent comparison.",
    );
    await new Promise((resolve) => setTimeout(resolve, 60_000));
    await mongo.close();
    mongo = new MongoClient(mongoEnv.MONGO_URL, {
      readPreference: "primary",
      readConcern: { level: "majority" },
      serverSelectionTimeoutMS: 15_000,
      connectTimeoutMS: 15_000,
    });
    await mongo.connect();
    const final = await inspectLiveSource(mongo, source);
    if (!final.exactMatch || !final.readOnly)
      throw new ImportGuardError("Final fenced source verification failed");
    await verifyLegacyWriterFence(mongo);
    if ((await checkoutArtifact()).hash !== proposal.artifact)
      throw new ImportGuardError("Checkout changed before production mutation");
    phase = "production-migrations";
    await migrate(drizzle(target), { migrationsFolder: "drizzle" });
    const verify = async () => {
      if ((await catalogFingerprint(target)) !== catalog)
        throw new ImportGuardError(
          "Production schema differs from reviewed catalog",
        );
    };
    phase = "atomic-production-import";
    const result = await executeImport(target, plan, receipt.planHash, verify);
    if ((await checkoutArtifact()).hash !== proposal.artifact)
      throw new ImportGuardError(
        "Checkout changed during import; stop activation and inspect the committed database receipt",
      );
    const after = await inspectLiveSource(mongo, source);
    if (!after.exactMatch || !after.readOnly)
      throw new ImportGuardError(
        "Source changed after import; stop activation",
      );
    await writeFile(
      `.private/production-import-${randomUUID()}.json`,
      JSON.stringify(
        { ...proposal, result, denial, completedAt: new Date().toISOString() },
        null,
        2,
      ),
      { mode: 0o600, flag: "wx" },
    );
    console.log(
      JSON.stringify({
        status: result.status,
        target: "production",
        planHash: receipt.planHash,
        sourceUnchanged: true,
      }),
    );
  } finally {
    await mongo.close();
    await baselineConnection?.end();
    await targetConnection?.end();
  }
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      status: "stopped",
      phase,
      reason:
        error instanceof ImportGuardError
          ? error.message
          : "Inspect protected receipts and provider state before retrying.",
    }),
  );
  process.exitCode = 1;
});
