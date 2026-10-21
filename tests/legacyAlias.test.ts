import type { Pool } from "pg";
import { expect, it } from "vitest";
import { user } from "@/db/schema/auth";
import { clients, practices } from "@/db/schema/practice";
import { resolveLegacyAlias } from "@/server/legacyAlias";
import { client, db } from "./memory-pglite";

const pool = {
  query: (text: string, values: unknown[]) => client.query(text, values),
} as unknown as Pool;
it("resolves only completed-import aliases through live owned parents and refuses ambiguity", async () => {
  const [owner, other] = await db
    .insert(user)
    .values([
      { name: "A", email: "alias-a@example.test" },
      { name: "B", email: "alias-b@example.test" },
    ])
    .returning();
  const [practice, another] = await db
    .insert(practices)
    .values([
      { ownerId: owner.id, name: "A" },
      { ownerId: owner.id, name: "Another" },
    ])
    .returning();
  const [child] = await db
    .insert(clients)
    .values({ practiceId: practice.id, givenName: "Synthetic" })
    .returning();
  const hash = "a".repeat(64);
  await client.query(
    "insert into legacy_import (singleton,source_hash,plan_hash,status) values (true,$1,$1,'prepared')",
    [hash],
  );
  for (const [collection, id, legacy] of [
    ["practices", practice.id, "old-practice"],
    ["clients", child.id, "old-client"],
  ])
    await client.query(
      "insert into legacy_aliases (source,collection,bson_type,legacy_id,canonical_id,source_hash) values ($1,$2,'string',$3,$4,$1)",
      [hash, collection, legacy, id],
    );
  expect(
    await resolveLegacyAlias(pool, owner.id, "practices", "old-practice"),
  ).toBeNull();
  await client.query("update legacy_import set status='complete'");
  expect(
    await resolveLegacyAlias(pool, owner.id, "practices", "old-practice"),
  ).toBe(practice.id);
  expect(
    await resolveLegacyAlias(pool, owner.id, "clients", "old-client"),
  ).toBe(child.id);
  expect(
    await resolveLegacyAlias(pool, other.id, "clients", "old-client"),
  ).toBeNull();
  await client.query(
    "insert into legacy_aliases (source,collection,bson_type,legacy_id,canonical_id,source_hash) values ($1,'practices','objectId','old-practice',$2,$1)",
    [hash, another.id],
  );
  expect(
    await resolveLegacyAlias(pool, owner.id, "practices", "old-practice"),
  ).toBeNull();
  await client.query("update practices set deleted_at=now() where id=$1", [
    practice.id,
  ]);
  expect(
    await resolveLegacyAlias(pool, owner.id, "clients", "old-client"),
  ).toBeNull();
});
