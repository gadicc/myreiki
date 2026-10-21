import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabasePool, databaseClientConfig } from "../src/db/connection";

/** The app's pg transport enforces required channel binding, unlike the generic CLI driver. */
async function main() {
  const selected = [
    "MIGRATION_DATABASE_URL_UNPOOLED",
    "MIGRATION_DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "DATABASE_URL",
  ].find((name) => process.env[name] !== undefined);
  const value = selected && process.env[selected];
  if (!value?.trim()) throw new Error("A direct migration URL is required");
  const config = databaseClientConfig(value);
  if (
    config.host?.includes("-pooler.") ||
    (process.env.LOOM_MIGRATION_DATABASE_ROLE &&
      process.env.LOOM_MIGRATION_DATABASE_ROLE !== config.user)
  )
    throw new Error("Migration role or direct endpoint does not match policy");
  const pool = createDatabasePool(value);
  try {
    const {
      rows: [identity],
    } = await pool.query(
      "select current_user as role,current_database() as database",
    );
    if (identity.role !== config.user || identity.database !== config.database)
      throw new Error("Migration identity mismatch");
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    console.log(
      "Drizzle migrations completed using the verified application transport.",
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Database migration failed; inspect the protected target before retrying.",
  );
  process.exitCode = 1;
});
