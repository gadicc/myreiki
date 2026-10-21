import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { uuidV7Check } from "./ids";

const instant = (name: string) => timestamp(name, { withTimezone: true });
const timestamps = () => ({
  createdAt: instant("created_at").notNull().defaultNow(),
  updatedAt: instant("updated_at").notNull().defaultNow(),
});
const id = () => uuid("id").primaryKey().default(sql`uuid_generate_v7()`);

/** Future SQL identity. Mongo remains authoritative until the rehearsed cutover. */
export const user = pgTable(
  "auth_user",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    admin: boolean("admin").notNull().default(false),
    practitioner: boolean("practitioner").notNull().default(false),
    ...timestamps(),
  },
  (table) => [uuidV7Check("auth_user_id_v7", table.id)],
);

export const session = pgTable(
  "auth_session",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    token: text("token").notNull().unique(),
    expiresAt: instant("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps(),
  },
  (table) => [
    uuidV7Check("auth_session_id_v7", table.id),
    index("auth_session_user_idx").on(table.userId),
  ],
);

/** Provider subjects remain opaque strings; email is never an account merge key. */
export const account = pgTable(
  "auth_account",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: instant("access_token_expires_at"),
    refreshTokenExpiresAt: instant("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...timestamps(),
  },
  (table) => [
    uuidV7Check("auth_account_id_v7", table.id),
    uniqueIndex("auth_account_provider_subject_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = pgTable(
  "auth_verification",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: instant("expires_at").notNull(),
    ...timestamps(),
  },
  (table) => [uuidV7Check("auth_verification_id_v7", table.id)],
);
