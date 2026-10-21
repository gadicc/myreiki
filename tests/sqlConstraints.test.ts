import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { clients, practices, treatments, user } from "@/db/schema";
import { client, db } from "./memory-pglite";

async function fixture() {
  const [owner] = await db
    .insert(user)
    .values({ name: "Synthetic", email: `${crypto.randomUUID()}@example.test` })
    .returning();
  const [practice] = await db
    .insert(practices)
    .values({ ownerId: owner.id, name: "Practice" })
    .returning();
  const [other] = await db
    .insert(practices)
    .values({ ownerId: owner.id, name: "Other" })
    .returning();
  const [person] = await db
    .insert(clients)
    .values({ practiceId: practice.id, givenName: "Aki" })
    .returning();
  return { owner, practice, other, person };
}

describe("SQL migration constraints (synthetic PGlite)", () => {
  it("generates UUIDv7 identities and retains exact Unicode/multiline values", async () => {
    const { practice } = await fixture();
    expect(practice.id).toMatch(/^[\da-f-]{14}7[\da-f]{3}-[89ab]/);
    const notes = "\uFEFF初回\r\n🌱\n";
    const [stored] = await db
      .insert(clients)
      .values({ practiceId: practice.id, givenName: "秋", notes })
      .returning();
    // PGlite's text decoder strips a leading BOM. Compare persisted UTF-8 in SQL,
    // then test ordinary Unicode reads separately; target-driver proof is pending.
    const bytes = await client.query<{ hex: string }>(
      "select encode(convert_to(notes, 'UTF8'), 'hex') as hex from clients where id = $1",
      [stored.id],
    );
    expect(bytes.rows[0].hex).toBe(Buffer.from(notes, "utf8").toString("hex"));
    const [plain] = await db
      .insert(clients)
      .values({
        practiceId: practice.id,
        givenName: "秋",
        notes: "初回\r\n🌱\n",
      })
      .returning();
    expect(plain.notes).toBe("初回\r\n🌱\n");
  });
  it("rejects UUIDv4 canonical identities", async () => {
    await expect(
      db.insert(user).values({
        id: crypto.randomUUID(),
        name: "Synthetic",
        email: "invalid-id@example.test",
      }),
    ).rejects.toThrow();
  });
  it("rejects cross-practice client references", async () => {
    const { owner, other, person } = await fixture();
    await expect(
      db.insert(treatments).values({
        practiceId: other.id,
        clientId: person.id,
        practitionerId: owner.id,
        date: new Date(),
        duration: 60,
        type: "generic",
      }),
    ).rejects.toThrow();
  });
  it("requires the selected modality details and a positive duration", async () => {
    const { owner, practice, person } = await fixture();
    const base = {
      practiceId: practice.id,
      clientId: person.id,
      practitionerId: owner.id,
      date: new Date(),
      duration: 60,
      type: "reiki" as const,
    };
    await expect(db.insert(treatments).values(base)).rejects.toThrow();
    await expect(
      db
        .insert(treatments)
        .values({ ...base, reikiType: "regular", duration: 0 }),
    ).rejects.toThrow();
    const [saved] = await db
      .insert(treatments)
      .values({ ...base, reikiType: "regular" })
      .returning();
    expect(saved.duration).toBe(60);
  });
  it("rejects infinite timestamps even through direct SQL", async () => {
    const { owner, practice, person } = await fixture();
    await expect(
      db.execute(
        sql`insert into treatments (practice_id, client_id, practitioner_id, date, duration, type) values (${practice.id}, ${person.id}, ${owner.id}, 'infinity', 60, 'generic')`,
      ),
    ).rejects.toThrow();
  });
  it("keeps provider subjects unique within their provider", async () => {
    const { owner } = await fixture();
    const { account } = await import("@/db/schema");
    const identity = {
      userId: owner.id,
      providerId: "google",
      accountId: "opaque-provider-subject",
    };
    await db.insert(account).values(identity);
    await expect(db.insert(account).values(identity)).rejects.toThrow();
    await db
      .insert(account)
      .values({ ...identity, providerId: "another-provider" });
  });
});
