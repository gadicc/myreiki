import { readFile, writeFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import superjson from "superjson";
import { catalogFingerprint } from "../src/migration/catalog";
import { connectImportDatabase } from "../src/migration/connection";
import { executeImport } from "../src/migration/executor";
import { fingerprintPlan, type ImportPlan } from "../src/migration/plan";
import { sourceFromSavedPlan } from "../src/migration/savedSource";
import { readSource } from "../src/migration/source";

function privateEnv(text: string) {
  return Object.fromEntries(
    text
      .trim()
      .split("\n")
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), JSON.parse(line.slice(i + 1)) as string];
      }),
  );
}

async function main() {
  const [mode, sourceRoot, planFile] = process.argv.slice(2);
  if (
    !["migrate", "apply", "resume"].includes(mode) ||
    !sourceRoot ||
    !planFile?.startsWith(".private/")
  )
    throw new Error(
      "Use migrate|apply|resume <dump-directory-or-unused-resume-path> <.private/plan-file>",
    );
  const encoded = await readFile(planFile, "utf8");
  const receipt = JSON.parse(
    await readFile(`${planFile}.receipt.json`, "utf8"),
  );
  const plan = superjson.parse<ImportPlan>(encoded);
  if (
    plan.version !== 1 ||
    fingerprintPlan(encoded) !== receipt.planHash ||
    plan.source !== receipt.source
  )
    throw new Error("Saved plan fingerprint mismatch");
  const source =
    mode === "resume"
      ? sourceFromSavedPlan(plan)
      : await readSource(sourceRoot);
  if (
    source.fingerprint !== plan.source ||
    JSON.stringify(source.files) !== JSON.stringify(plan.files)
  )
    throw new Error("Protected source changed");
  // Only this explicitly provisioned rehearsal endpoint is accepted. There is
  // deliberately no production mode or default DATABASE_URL fallback here.
  const rehearsal = privateEnv(
    await readFile(".private/neon-migration-rehearsal.env", "utf8"),
  );
  const development = privateEnv(
    await readFile(".private/neon-development-synthetic.env", "utf8"),
  );
  const target = await connectImportDatabase(
    rehearsal.DATABASE_URL_UNPOOLED,
    "ep-raspy-forest-azru6iy8.c-3.ap-southeast-1.aws.neon.tech",
  );
  try {
    const baseline = await connectImportDatabase(
      development.DATABASE_URL_UNPOOLED,
      "ep-summer-breeze-az0jgg8u.c-3.ap-southeast-1.aws.neon.tech",
    );
    try {
      if (mode === "migrate") {
        await migrate(drizzle(baseline), { migrationsFolder: "drizzle" });
        await migrate(drizzle(target), { migrationsFolder: "drizzle" });
        console.log(
          "Migrations applied to synthetic development and protected rehearsal only.",
        );
      }
      const expectedCatalog = await catalogFingerprint(baseline);
      const verify = async () => {
        if ((await catalogFingerprint(target)) !== expectedCatalog)
          throw new Error(
            "Rehearsal catalog differs from fresh migration baseline",
          );
      };
      await verify();
      if (mode === "apply" || mode === "resume") {
        if (mode === "resume") {
          const {
            rows: [checkpoint],
          } = await target.query(
            "select source_hash,plan_hash from legacy_import where singleton=true",
          );
          if (
            checkpoint?.source_hash !== plan.source ||
            checkpoint.plan_hash !== receipt.planHash
          )
            throw new Error(
              "A matching database checkpoint is required for source-free resume",
            );
        }
        const result = await executeImport(
          target,
          plan,
          receipt.planHash,
          verify,
        );
        await writeFile(
          `${planFile}.rehearsal.json`,
          JSON.stringify(
            {
              ...result,
              source: source.fingerprint,
              catalog: expectedCatalog,
              target: "migration-rehearsal",
              verifiedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
          { mode: 0o600 },
        );
        console.log(
          JSON.stringify({
            ...result,
            comparedTables: 11,
            oldSessions: 0,
            target: "migration-rehearsal",
          }),
        );
      }
    } finally {
      await baseline.end();
    }
  } finally {
    await target.end();
  }
}

main().catch((error) => {
  // PostgreSQL constraint details can include patient values. Log only an
  // application error or a bounded SQLSTATE, never driver detail/parameters.
  console.error(
    error instanceof Error && !Reflect.has(error, "severity")
      ? error.message
      : "Rehearsal database operation failed; inspect privately.",
  );
  process.exitCode = 1;
});
