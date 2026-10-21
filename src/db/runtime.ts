import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { createDatabasePool } from "./connection";

const globalDb = globalThis as typeof globalThis & {
  myreikiSql?: ReturnType<typeof createDatabasePool>;
};
// Build-time placeholders are never opened or parsed as runtime destinations.
export const pool = (globalDb.myreikiSql ??= createDatabasePool(() => {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  return url;
}));
export const db = drizzle(pool);
