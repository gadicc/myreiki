import { sql } from "drizzle-orm";
import { type AnyPgColumn, check } from "drizzle-orm/pg-core";

/** Enforce the canonical UUID version and RFC variant for imported and runtime rows. */
export function uuidV7Check(name: string, column: AnyPgColumn) {
  return check(
    name,
    sql`substring(${column}::text from 15 for 1) = '7' and substring(${column}::text from 20 for 1) in ('8', '9', 'a', 'b')`,
  );
}
