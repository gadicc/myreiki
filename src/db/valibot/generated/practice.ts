// This file is auto-generated. Do not edit.

import * as v from "valibot";

export const clientsSelect = v.object({
  id: v.pipe(v.string(), v.uuid()),
  version: v.pipe(
    v.number(),
    v.minValue(-9007199254740991),
    v.maxValue(9007199254740991),
    v.integer(),
  ),
  deletedAt: v.nullable(v.date()),
  practiceId: v.pipe(v.string(), v.uuid()),
  givenName: v.string(),
  familyName: v.nullable(v.string()),
  phone: v.nullable(v.string()),
  email: v.nullable(v.string()),
  notes: v.nullable(v.string()),
  createdAt: v.nullable(v.date()),
});

export const clientsInsert = v.object({
  id: v.optional(v.pipe(v.string(), v.uuid())),
  version: v.optional(
    v.pipe(
      v.number(),
      v.minValue(-9007199254740991),
      v.maxValue(9007199254740991),
      v.integer(),
    ),
  ),
  deletedAt: v.optional(v.nullable(v.date())),
  practiceId: v.pipe(v.string(), v.uuid()),
  givenName: v.string(),
  familyName: v.optional(v.nullable(v.string())),
  phone: v.optional(v.nullable(v.string())),
  email: v.optional(v.nullable(v.string())),
  notes: v.optional(v.nullable(v.string())),
  createdAt: v.optional(v.nullable(v.date())),
});

export const clientsUpdate = v.object({
  id: v.optional(v.pipe(v.string(), v.uuid())),
  version: v.optional(
    v.pipe(
      v.number(),
      v.minValue(-9007199254740991),
      v.maxValue(9007199254740991),
      v.integer(),
    ),
  ),
  deletedAt: v.optional(v.nullable(v.date())),
  practiceId: v.optional(v.pipe(v.string(), v.uuid())),
  givenName: v.optional(v.string()),
  familyName: v.optional(v.nullable(v.string())),
  phone: v.optional(v.nullable(v.string())),
  email: v.optional(v.nullable(v.string())),
  notes: v.optional(v.nullable(v.string())),
  createdAt: v.optional(v.nullable(v.date())),
});

export type ClientsSelect = v.InferOutput<typeof clientsSelect>;
export type ClientsInsert = v.InferInput<typeof clientsInsert>;
export type ClientsUpdate = v.InferInput<typeof clientsUpdate>;
export const practicesSelect = v.object({
  id: v.pipe(v.string(), v.uuid()),
  version: v.pipe(
    v.number(),
    v.minValue(-9007199254740991),
    v.maxValue(9007199254740991),
    v.integer(),
  ),
  deletedAt: v.nullable(v.date()),
  ownerId: v.pipe(v.string(), v.uuid()),
  name: v.string(),
  countryId: v.nullable(v.string()),
  phone: v.nullable(v.string()),
  email: v.nullable(v.string()),
  website: v.nullable(v.string()),
  notes: v.nullable(v.string()),
});

export const practicesInsert = v.object({
  id: v.optional(v.pipe(v.string(), v.uuid())),
  version: v.optional(
    v.pipe(
      v.number(),
      v.minValue(-9007199254740991),
      v.maxValue(9007199254740991),
      v.integer(),
    ),
  ),
  deletedAt: v.optional(v.nullable(v.date())),
  ownerId: v.pipe(v.string(), v.uuid()),
  name: v.string(),
  countryId: v.optional(v.nullable(v.string())),
  phone: v.optional(v.nullable(v.string())),
  email: v.optional(v.nullable(v.string())),
  website: v.optional(v.nullable(v.string())),
  notes: v.optional(v.nullable(v.string())),
});

export const practicesUpdate = v.object({
  id: v.optional(v.pipe(v.string(), v.uuid())),
  version: v.optional(
    v.pipe(
      v.number(),
      v.minValue(-9007199254740991),
      v.maxValue(9007199254740991),
      v.integer(),
    ),
  ),
  deletedAt: v.optional(v.nullable(v.date())),
  ownerId: v.optional(v.pipe(v.string(), v.uuid())),
  name: v.optional(v.string()),
  countryId: v.optional(v.nullable(v.string())),
  phone: v.optional(v.nullable(v.string())),
  email: v.optional(v.nullable(v.string())),
  website: v.optional(v.nullable(v.string())),
  notes: v.optional(v.nullable(v.string())),
});

export type PracticesSelect = v.InferOutput<typeof practicesSelect>;
export type PracticesInsert = v.InferInput<typeof practicesInsert>;
export type PracticesUpdate = v.InferInput<typeof practicesUpdate>;
export const treatmentsSelect = v.object({
  id: v.pipe(v.string(), v.uuid()),
  version: v.pipe(
    v.number(),
    v.minValue(-9007199254740991),
    v.maxValue(9007199254740991),
    v.integer(),
  ),
  deletedAt: v.nullable(v.date()),
  practiceId: v.pipe(v.string(), v.uuid()),
  clientId: v.pipe(v.string(), v.uuid()),
  practitionerId: v.pipe(v.string(), v.uuid()),
  date: v.date(),
  duration: v.pipe(
    v.number(),
    v.minValue(-9007199254740991),
    v.maxValue(9007199254740991),
    v.integer(),
  ),
  type: v.enum({ generic: "generic", reiki: "reiki" }),
  reikiType: v.nullable(
    v.enum({
      regular: "regular",
      psychological: "psychological",
      self: "self",
      distance: "distance",
      "non-human": "non-human",
    }),
  ),
  bodyPoints: v.nullable(
    v.union([
      v.union([v.string(), v.number(), v.boolean(), (v.null ?? v.null_)()]),
      v.array(v.any()),
      v.record(v.string(), v.any()),
    ]),
  ),
  notes: v.nullable(v.string()),
});

export const treatmentsInsert = v.object({
  id: v.optional(v.pipe(v.string(), v.uuid())),
  version: v.optional(
    v.pipe(
      v.number(),
      v.minValue(-9007199254740991),
      v.maxValue(9007199254740991),
      v.integer(),
    ),
  ),
  deletedAt: v.optional(v.nullable(v.date())),
  practiceId: v.pipe(v.string(), v.uuid()),
  clientId: v.pipe(v.string(), v.uuid()),
  practitionerId: v.pipe(v.string(), v.uuid()),
  date: v.date(),
  duration: v.pipe(
    v.number(),
    v.minValue(-9007199254740991),
    v.maxValue(9007199254740991),
    v.integer(),
  ),
  type: v.enum({ generic: "generic", reiki: "reiki" }),
  reikiType: v.optional(
    v.nullable(
      v.enum({
        regular: "regular",
        psychological: "psychological",
        self: "self",
        distance: "distance",
        "non-human": "non-human",
      }),
    ),
  ),
  bodyPoints: v.optional(
    v.nullable(
      v.union([
        v.union([v.string(), v.number(), v.boolean(), (v.null ?? v.null_)()]),
        v.array(v.any()),
        v.record(v.string(), v.any()),
      ]),
    ),
  ),
  notes: v.optional(v.nullable(v.string())),
});

export const treatmentsUpdate = v.object({
  id: v.optional(v.pipe(v.string(), v.uuid())),
  version: v.optional(
    v.pipe(
      v.number(),
      v.minValue(-9007199254740991),
      v.maxValue(9007199254740991),
      v.integer(),
    ),
  ),
  deletedAt: v.optional(v.nullable(v.date())),
  practiceId: v.optional(v.pipe(v.string(), v.uuid())),
  clientId: v.optional(v.pipe(v.string(), v.uuid())),
  practitionerId: v.optional(v.pipe(v.string(), v.uuid())),
  date: v.optional(v.date()),
  duration: v.optional(
    v.pipe(
      v.number(),
      v.minValue(-9007199254740991),
      v.maxValue(9007199254740991),
      v.integer(),
    ),
  ),
  type: v.optional(v.enum({ generic: "generic", reiki: "reiki" })),
  reikiType: v.optional(
    v.nullable(
      v.enum({
        regular: "regular",
        psychological: "psychological",
        self: "self",
        distance: "distance",
        "non-human": "non-human",
      }),
    ),
  ),
  bodyPoints: v.optional(
    v.nullable(
      v.union([
        v.union([v.string(), v.number(), v.boolean(), (v.null ?? v.null_)()]),
        v.array(v.any()),
        v.record(v.string(), v.any()),
      ]),
    ),
  ),
  notes: v.optional(v.nullable(v.string())),
});

export type TreatmentsSelect = v.InferOutput<typeof treatmentsSelect>;
export type TreatmentsInsert = v.InferInput<typeof treatmentsInsert>;
export type TreatmentsUpdate = v.InferInput<typeof treatmentsUpdate>;
