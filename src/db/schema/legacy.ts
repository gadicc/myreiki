import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { uuidV7Check } from "./ids";

/** Stable typed source aliases; allocation must be saved before the import writes. */
export const legacyAliases = pgTable(
  "legacy_aliases",
  {
    source: text("source").notNull(),
    collection: text("collection").notNull(),
    bsonType: text("bson_type").notNull(),
    legacyId: text("legacy_id").notNull(),
    canonicalId: uuid("canonical_id").notNull(),
    sourceHash: text("source_hash").notNull(),
  },
  (table) => [
    uuidV7Check("legacy_alias_canonical_v7", table.canonicalId),
    primaryKey({
      columns: [table.source, table.collection, table.bsonType, table.legacyId],
    }),
  ],
);

/** Typed archival payloads stay private and are never returned by product APIs. */
export const legacyRecords = pgTable(
  "legacy_records",
  {
    source: text("source").notNull(),
    collection: text("collection").notNull(),
    bsonType: text("bson_type").notNull(),
    legacyId: text("legacy_id").notNull(),
    sourceHash: text("source_hash").notNull(),
    ejson: jsonb("ejson").notNull(),
    disposition: text("disposition").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.source, table.collection, table.bsonType, table.legacyId],
    }),
  ],
);

/** A single bootstrap reservation survives failed imports and rejects a different plan. */
export const legacyImport = pgTable(
  "legacy_import",
  {
    singleton: boolean("singleton").primaryKey().default(true),
    sourceHash: text("source_hash").notNull(),
    planHash: text("plan_hash").notNull(),
    status: text("status", { enum: ["prepared", "complete"] }).notNull(),
  },
  (table) => [
    check("legacy_import_singleton", sql`${table.singleton} = true`),
    check(
      "legacy_import_status",
      sql`${table.status} in ('prepared', 'complete')`,
    ),
  ],
);

/** Receipt and domain write commit together; retries retain the original payload. */
export const syncReceipts = pgTable(
  "sync_receipts",
  {
    ownerId: uuid("owner_id").notNull(),
    operationId: uuid("operation_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    result: jsonb("result").notNull(),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.operationId] })],
);

/** Orders snapshots and acknowledgements across devices without using wall clocks. */
export const practiceSyncState = pgTable(
  "practice_sync_state",
  {
    ownerId: uuid("owner_id").primaryKey(),
    revision: bigint("revision", { mode: "number" }).notNull(),
  },
  (table) => [
    check(
      "practice_sync_revision_safe",
      sql`${table.revision} >= 0 and ${table.revision} <= 9007199254740991`,
    ),
  ],
);
