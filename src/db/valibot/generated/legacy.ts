// This file is auto-generated. Do not edit.

import * as v from "valibot";

export const legacyAliasesSelect = v.object({
  source: v.string(),
  collection: v.string(),
  bsonType: v.string(),
  legacyId: v.string(),
  canonicalId: v.pipe(v.string(), v.uuid()),
  sourceHash: v.string(),
});

export const legacyAliasesInsert = v.object({
  source: v.string(),
  collection: v.string(),
  bsonType: v.string(),
  legacyId: v.string(),
  canonicalId: v.pipe(v.string(), v.uuid()),
  sourceHash: v.string(),
});

export const legacyAliasesUpdate = v.object({
  source: v.optional(v.string()),
  collection: v.optional(v.string()),
  bsonType: v.optional(v.string()),
  legacyId: v.optional(v.string()),
  canonicalId: v.optional(v.pipe(v.string(), v.uuid())),
  sourceHash: v.optional(v.string()),
});

export type LegacyAliasesSelect = v.InferOutput<typeof legacyAliasesSelect>;
export type LegacyAliasesInsert = v.InferInput<typeof legacyAliasesInsert>;
export type LegacyAliasesUpdate = v.InferInput<typeof legacyAliasesUpdate>;
export const legacyImportSelect = v.object({
  singleton: v.boolean(),
  sourceHash: v.string(),
  planHash: v.string(),
  status: v.enum({ prepared: "prepared", complete: "complete" }),
});

export const legacyImportInsert = v.object({
  singleton: v.optional(v.boolean()),
  sourceHash: v.string(),
  planHash: v.string(),
  status: v.enum({ prepared: "prepared", complete: "complete" }),
});

export const legacyImportUpdate = v.object({
  singleton: v.optional(v.boolean()),
  sourceHash: v.optional(v.string()),
  planHash: v.optional(v.string()),
  status: v.optional(v.enum({ prepared: "prepared", complete: "complete" })),
});

export type LegacyImportSelect = v.InferOutput<typeof legacyImportSelect>;
export type LegacyImportInsert = v.InferInput<typeof legacyImportInsert>;
export type LegacyImportUpdate = v.InferInput<typeof legacyImportUpdate>;
export const legacyRecordsSelect = v.object({
  source: v.string(),
  collection: v.string(),
  bsonType: v.string(),
  legacyId: v.string(),
  sourceHash: v.string(),
  ejson: v.union([
    v.union([v.string(), v.number(), v.boolean(), (v.null ?? v.null_)()]),
    v.array(v.any()),
    v.record(v.string(), v.any()),
  ]),
  disposition: v.string(),
});

export const legacyRecordsInsert = v.object({
  source: v.string(),
  collection: v.string(),
  bsonType: v.string(),
  legacyId: v.string(),
  sourceHash: v.string(),
  ejson: v.union([
    v.union([v.string(), v.number(), v.boolean(), (v.null ?? v.null_)()]),
    v.array(v.any()),
    v.record(v.string(), v.any()),
  ]),
  disposition: v.string(),
});

export const legacyRecordsUpdate = v.object({
  source: v.optional(v.string()),
  collection: v.optional(v.string()),
  bsonType: v.optional(v.string()),
  legacyId: v.optional(v.string()),
  sourceHash: v.optional(v.string()),
  ejson: v.optional(
    v.union([
      v.union([v.string(), v.number(), v.boolean(), (v.null ?? v.null_)()]),
      v.array(v.any()),
      v.record(v.string(), v.any()),
    ]),
  ),
  disposition: v.optional(v.string()),
});

export type LegacyRecordsSelect = v.InferOutput<typeof legacyRecordsSelect>;
export type LegacyRecordsInsert = v.InferInput<typeof legacyRecordsInsert>;
export type LegacyRecordsUpdate = v.InferInput<typeof legacyRecordsUpdate>;
export const practiceSyncStateSelect = v.object({
  ownerId: v.pipe(v.string(), v.uuid()),
  revision: v.pipe(
    v.number(),
    v.minValue(-9007199254740991),
    v.maxValue(9007199254740991),
    v.integer(),
  ),
});

export const practiceSyncStateInsert = v.object({
  ownerId: v.pipe(v.string(), v.uuid()),
  revision: v.pipe(
    v.number(),
    v.minValue(-9007199254740991),
    v.maxValue(9007199254740991),
    v.integer(),
  ),
});

export const practiceSyncStateUpdate = v.object({
  ownerId: v.optional(v.pipe(v.string(), v.uuid())),
  revision: v.optional(
    v.pipe(
      v.number(),
      v.minValue(-9007199254740991),
      v.maxValue(9007199254740991),
      v.integer(),
    ),
  ),
});

export type PracticeSyncStateSelect = v.InferOutput<
  typeof practiceSyncStateSelect
>;
export type PracticeSyncStateInsert = v.InferInput<
  typeof practiceSyncStateInsert
>;
export type PracticeSyncStateUpdate = v.InferInput<
  typeof practiceSyncStateUpdate
>;
export const syncReceiptsSelect = v.object({
  ownerId: v.pipe(v.string(), v.uuid()),
  operationId: v.pipe(v.string(), v.uuid()),
  payloadHash: v.string(),
  result: v.union([
    v.union([v.string(), v.number(), v.boolean(), (v.null ?? v.null_)()]),
    v.array(v.any()),
    v.record(v.string(), v.any()),
  ]),
});

export const syncReceiptsInsert = v.object({
  ownerId: v.pipe(v.string(), v.uuid()),
  operationId: v.pipe(v.string(), v.uuid()),
  payloadHash: v.string(),
  result: v.union([
    v.union([v.string(), v.number(), v.boolean(), (v.null ?? v.null_)()]),
    v.array(v.any()),
    v.record(v.string(), v.any()),
  ]),
});

export const syncReceiptsUpdate = v.object({
  ownerId: v.optional(v.pipe(v.string(), v.uuid())),
  operationId: v.optional(v.pipe(v.string(), v.uuid())),
  payloadHash: v.optional(v.string()),
  result: v.optional(
    v.union([
      v.union([v.string(), v.number(), v.boolean(), (v.null ?? v.null_)()]),
      v.array(v.any()),
      v.record(v.string(), v.any()),
    ]),
  ),
});

export type SyncReceiptsSelect = v.InferOutput<typeof syncReceiptsSelect>;
export type SyncReceiptsInsert = v.InferInput<typeof syncReceiptsInsert>;
export type SyncReceiptsUpdate = v.InferInput<typeof syncReceiptsUpdate>;
