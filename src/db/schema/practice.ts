import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { Treatment } from "../../schemas/treatment";
import { user } from "./auth";
import { uuidV7Check } from "./ids";

const recordFields = () => ({
  id: uuid("id").primaryKey().default(sql`uuid_generate_v7()`),
  version: bigint("version", { mode: "number" }).notNull().default(1),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/** Ownership is explicit and cannot change through ordinary editing. */
export const practices = pgTable(
  "practices",
  {
    ...recordFields(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => user.id),
    name: text("name").notNull(),
    countryId: text("country_id"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    notes: text("notes"),
  },
  (table) => [
    uuidV7Check("practices_id_v7", table.id),
    index("practices_owner_idx").on(table.ownerId),
    check("practices_version_positive", sql`${table.version} > 0`),
  ],
);

export const clients = pgTable(
  "clients",
  {
    ...recordFields(),
    practiceId: uuid("practice_id")
      .notNull()
      .references(() => practices.id),
    givenName: text("given_name").notNull(),
    familyName: text("family_name"),
    phone: text("phone"),
    email: text("email"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }),
  },
  (table) => [
    uuidV7Check("clients_id_v7", table.id),
    unique("clients_id_practice_unique").on(table.id, table.practiceId),
    index("clients_practice_idx").on(table.practiceId),
    check("clients_version_positive", sql`${table.version} > 0`),
  ],
);

/** Composite client reference prevents cross-practice treatment attribution. */
export const treatments = pgTable(
  "treatments",
  {
    ...recordFields(),
    practiceId: uuid("practice_id")
      .notNull()
      .references(() => practices.id),
    clientId: uuid("client_id").notNull(),
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => user.id),
    date: timestamp("date", { withTimezone: true }).notNull(),
    duration: bigint("duration", { mode: "number" }).notNull(),
    type: text("type", { enum: ["generic", "reiki"] }).notNull(),
    reikiType: text("reiki_type", {
      enum: ["regular", "psychological", "self", "distance", "non-human"],
    }),
    bodyPoints: jsonb("body_points").$type<Treatment["bodyPoints"]>(),
    notes: text("notes"),
  },
  (table) => [
    uuidV7Check("treatments_id_v7", table.id),
    foreignKey({
      name: "treatments_client_practice_fk",
      columns: [table.clientId, table.practiceId],
      foreignColumns: [clients.id, clients.practiceId],
    }),
    index("treatments_practice_date_idx").on(table.practiceId, table.date),
    check(
      "treatments_duration_positive",
      sql`${table.duration} > 0 and ${table.duration} <= 9007199254740991`,
    ),
    check("treatments_version_positive", sql`${table.version} > 0`),
    check("treatments_type_valid", sql`${table.type} in ('generic', 'reiki')`),
    check(
      "treatments_reiki_type_valid",
      sql`(${table.type} = 'generic' and ${table.reikiType} is null) or (${table.type} = 'reiki' and ${table.reikiType} is not null and ${table.reikiType} in ('regular', 'psychological', 'self', 'distance', 'non-human'))`,
    ),
    check("treatments_date_finite", sql`isfinite(${table.date})`),
  ],
);
