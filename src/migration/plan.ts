import { BSON } from "mongodb";
import type * as schema from "@/db/schema";
import { uuidV7 } from "@/lib/uuid";
import { digest, type Source, type SourceRow, typedId } from "./source";

type Insert<T extends { $inferInsert: unknown }> = T["$inferInsert"];
/** Complete, saved allocations; never regenerate these on an apply retry. */
export interface ImportPlan {
  version: 1;
  source: string;
  preparedAt: Date;
  files: Source["files"];
  users: Insert<typeof schema.user>[];
  accounts: Insert<typeof schema.account>[];
  practices: Insert<typeof schema.practices>[];
  clients: Insert<typeof schema.clients>[];
  treatments: Insert<typeof schema.treatments>[];
  aliases: Insert<typeof schema.legacyAliases>[];
  archives: Insert<typeof schema.legacyRecords>[];
}

const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("Expected source object");
  return v as Record<string, unknown>;
};
const text = (v: unknown) => {
  if (typeof v !== "string") throw new Error("Expected source text");
  return v;
};
const optional = (v: unknown) => (v == null ? null : text(v));
const date = (v: unknown) => {
  if (!(v instanceof Date) || !Number.isFinite(v.getTime()))
    throw new Error("Expected finite source date");
  return v;
};
const key = (collection: string, type: string, id: string) =>
  JSON.stringify([collection, type, id]);

/** Plan exact domain rows and retired auth archives without giving old sessions authority. */
export function planImport(
  sourceInput: Source,
  allocate = uuidV7,
  preparedAt = new Date(),
): ImportPlan {
  // Snapshot before callbacks so allocation cannot change the source being approved.
  const source = structuredClone(sourceInput);
  // BSON IDs must retain their prototypes while caller mutation stays isolated.
  source.rows = sourceInput.rows.map((row) => ({
    ...row,
    document: BSON.deserialize(BSON.serialize(row.document)),
    ejson: structuredClone(row.ejson),
  }));
  const plan: ImportPlan = {
    version: 1,
    source: source.fingerprint,
    files: source.files,
    preparedAt: new Date(preparedAt),
    users: [],
    accounts: [],
    practices: [],
    clients: [],
    treatments: [],
    aliases: [],
    archives: [],
  };
  const mapping = new Map<string, string>();
  const rows = new Map<string, SourceRow>();
  for (const row of source.rows) {
    const k = key(row.collection, row.idType, row.id);
    if (rows.has(k)) throw new Error("Duplicate source identity");
    rows.set(k, row);
    const retired =
      row.collection === "sessions" || row.collection === "verification_tokens";
    plan.archives.push({
      source: plan.source,
      collection: row.collection,
      bsonType: row.idType,
      legacyId: row.id,
      sourceHash: row.hash,
      ejson: row.ejson,
      disposition: retired ? "retired-auth" : "mapped",
    });
    if (!retired) {
      const canonicalId = allocate();
      if (
        !/^[a-f\d]{8}-[a-f\d]{4}-7[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/.test(
          canonicalId,
        ) ||
        [...mapping.values()].includes(canonicalId)
      )
        throw new Error("Invalid or repeated UUIDv7 allocation");
      mapping.set(k, canonicalId);
      plan.aliases.push({
        source: plan.source,
        collection: row.collection,
        bsonType: row.idType,
        legacyId: row.id,
        canonicalId,
        sourceHash: row.hash,
      });
    }
  }
  function resolve(collection: string, value: unknown, allowHexString = false) {
    const id = typedId(value);
    const exact = key(collection, id.type, id.id);
    if (
      allowHexString &&
      id.type === "string" &&
      mapping.has(exact) &&
      mapping.has(key(collection, "objectId", id.id))
    )
      throw new Error("Ambiguous string/ObjectId source reference");
    if (mapping.has(exact)) return mapping.get(exact)!;
    // Gongo serialized treatment.clientId as hex text. Resolve only a unique,
    // existing ObjectId target, never collapse a string entity with the same text.
    if (allowHexString && id.type === "string" && /^[a-f\d]{24}$/.test(id.id)) {
      const fallback = mapping.get(key(collection, "objectId", id.id));
      if (fallback) return fallback;
    }
    throw new Error("Unresolved typed source reference");
  }
  const ids = (row: SourceRow) => resolve(row.collection, row.document._id);
  for (const row of source.rows.filter((x) => x.collection === "users")) {
    const d = row.document;
    const emails = d.emails;
    const email = text(d.email);
    if (
      !Array.isArray(emails) ||
      !emails.some((x) => record(x).value === email)
    )
      throw new Error("Conflicting source email projections");
    const createdAt = date(d.createdAt);
    plan.users.push({
      id: ids(row),
      name: text(d.name ?? d.displayName),
      email,
      emailVerified:
        d.emailVerified === true ||
        emails.some(
          (x) => record(x).value === email && record(x).verified === true,
        ),
      image: optional(d.image),
      admin: d.admin === true,
      practitioner: d.practitioner === true,
      createdAt,
      updatedAt: d.updatedAt == null ? createdAt : date(d.updatedAt),
    });
  }
  const subjects = new Set<string>();
  for (const row of source.rows.filter((x) => x.collection === "accounts")) {
    const d = row.document;
    if (d.provider !== "google" || d.type !== "oauth")
      throw new Error("Unsupported source account strategy");
    const accountId = text(d.providerAccountId);
    const ownerId = resolve("users", d.userId);
    if (subjects.has(accountId)) throw new Error("Repeated provider subject");
    subjects.add(accountId);
    const sourceUser = source.rows.find(
      (x) => x.collection === "users" && ids(x) === ownerId,
    )!;
    const services = sourceUser.document.services;
    if (
      !Array.isArray(services) ||
      !services.some(
        (s) =>
          record(s).service === "google" &&
          record(s).id === accountId &&
          record(record(record(s).profile)._json).sub === accountId,
      )
    )
      throw new Error("Conflicting embedded provider identity");
    const createdAt = plan.users.find((x) => x.id === ownerId)!.createdAt!;
    plan.accounts.push({
      id: ids(row),
      userId: ownerId,
      providerId: "google",
      accountId,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      password: null,
      scope: optional(d.scope),
      createdAt,
      updatedAt: d.updatedAt == null ? createdAt : date(d.updatedAt),
    });
  }
  if (plan.users.some((u) => !plan.accounts.some((a) => a.userId === u.id)))
    throw new Error("User has no verified provider binding");
  for (const row of source.rows.filter((x) => x.collection === "practices")) {
    const d = row.document;
    plan.practices.push({
      id: ids(row),
      version: 1,
      deletedAt: null,
      ownerId: resolve("users", d.userId),
      name: text(d.name),
      countryId: optional(d.countryId),
      phone: optional(d.phone),
      email: optional(d.email),
      website: optional(d.website),
      notes: optional(d.notes),
    });
  }
  for (const row of source.rows.filter((x) => x.collection === "clients")) {
    const d = row.document;
    plan.clients.push({
      id: ids(row),
      version: 1,
      deletedAt: null,
      practiceId: resolve("practices", d.practiceId),
      givenName: text(d.givenName),
      familyName: optional(d.familyName),
      phone: optional(d.phone),
      email: optional(d.email),
      notes: optional(d.notes),
      createdAt: d.createdAt == null ? null : date(d.createdAt),
    });
  }
  for (const row of source.rows.filter((x) => x.collection === "treatments")) {
    const d = row.document;
    const id = ids(row),
      practiceId = resolve("practices", d.practiceId),
      clientId = resolve("clients", d.clientId, true),
      practitionerId = resolve("users", d.practitionerId);
    if (
      plan.clients.find((c) => c.id === clientId)?.practiceId !== practiceId ||
      plan.practices.find((p) => p.id === practiceId)?.ownerId !==
        practitionerId
    )
      throw new Error("Cross-owner or cross-practice source treatment");
    if (
      typeof d.duration !== "number" ||
      !Number.isSafeInteger(d.duration) ||
      d.duration < 1
    )
      throw new Error("Invalid source duration");
    if (d.type !== "reiki" && d.type !== "generic")
      throw new Error("Unknown source modality");
    const reikiType = d.type === "reiki" ? text(record(d.reiki).type) : null;
    if (
      reikiType !== null &&
      !["regular", "psychological", "self", "distance", "non-human"].includes(
        reikiType,
      )
    )
      throw new Error("Unknown source Reiki type");
    let bodyPoints: Insert<typeof schema.treatments>["bodyPoints"] = null;
    if (d.bodyPoints != null) {
      const body = record(d.bodyPoints);
      const side = (value: unknown) => {
        if (!Array.isArray(value)) throw new Error("Invalid body-point side");
        return value.map((point) => {
          const p = record(point);
          if (resolve("treatments", p.treatmentId, true) !== id)
            throw new Error("Source body point belongs to another treatment");
          for (const k of ["x", "y", "size", "level"])
            if (typeof p[k] !== "number" || !Number.isFinite(p[k]))
              throw new Error("Invalid body point");
          const x = p.x as number,
            y = p.y as number,
            size = p.size as number,
            level = p.level as number;
          if (
            x < 0 ||
            x > 1 ||
            y < 0 ||
            y > 1 ||
            size < 1 ||
            size > 5 ||
            level < 1 ||
            level > 5
          )
            throw new Error("Body point out of range");
          return { _id: allocate(), treatmentId: id, x, y, size, level };
        });
      };
      bodyPoints = { front: side(body.front), back: side(body.back) };
    }
    plan.treatments.push({
      id,
      version: 1,
      deletedAt: null,
      practiceId,
      clientId,
      practitionerId,
      date: date(d.date),
      duration: d.duration,
      type: d.type,
      reikiType: reikiType as Insert<typeof schema.treatments>["reikiType"],
      bodyPoints,
      notes: optional(d.notes),
    });
  }
  if (new Set(plan.users.map((u) => u.email)).size !== plan.users.length)
    throw new Error("Duplicate account emails require review");
  return plan;
}

/** Fingerprint the saved wire representation, including all exact text and dates. */
export function fingerprintPlan(encoded: string) {
  return digest(encoded);
}
