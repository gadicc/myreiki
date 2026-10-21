import * as v from "valibot";
import type { Client, Practice, Treatment } from "@/schemas";
import { clientSchema, practiceSchema, treatmentSchema } from "@/schemas";

type Stored<T> = T extends unknown
  ? Omit<T, "__ObjectIDs" | "_id"> & {
      _id: string;
      version: number;
      deletedAt: Date | null;
    }
  : never;
export interface Records {
  practices: Stored<Practice>;
  clients: Stored<Client>;
  treatments: Stored<Treatment>;
}
export type RecordKind = keyof Records;
type WithoutMetadata<T> = T extends unknown
  ? Omit<T, "version" | "deletedAt">
  : never;
export type EditableRecord<K extends RecordKind> = WithoutMetadata<
  Records[K]
> & { _id: string };
export interface Profile {
  _id: string;
  displayName: string;
  email: string;
  image: string | null;
  admin: boolean;
  practitioner: boolean;
}
export interface Snapshot {
  actor: Profile;
  revision: number;
  practices: Records["practices"][];
  clients: Records["clients"][];
  treatments: Records["treatments"][];
}
export interface Operation {
  protocol: 1;
  operationId: string;
  actorId: string;
  collection: RecordKind;
  id: string;
  baseVersion: number;
  kind: "save" | "delete";
  record?: Records[RecordKind];
}
export interface OperationResult {
  ownerRevision: number;
  operationId: string;
  collection: RecordKind;
  record: Records[RecordKind];
}

export const canonicalId = v.pipe(
  v.string(),
  v.regex(/^[a-f\d]{8}-[a-f\d]{4}-7[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/),
);
const version = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0),
  v.maxValue(Number.MAX_SAFE_INTEGER - 1),
);
const operationSchema = v.strictObject({
  protocol: v.literal(1),
  operationId: canonicalId,
  actorId: canonicalId,
  collection: v.picklist(["practices", "clients", "treatments"]),
  id: canonicalId,
  baseVersion: version,
  kind: v.picklist(["save", "delete"]),
  record: v.optional(v.unknown()),
});

/** Validate the wire command and remove form-only bookkeeping from its payload. */
export function parseOperation(input: unknown): Operation {
  const operation = v.parse(operationSchema, input);
  if (operation.kind === "delete") {
    if (operation.record !== undefined || operation.baseVersion === 0)
      throw new Error("Invalid deletion");
    return operation as Operation;
  }
  const schema = {
    practices: practiceSchema,
    clients: clientSchema,
    treatments: treatmentSchema,
  }[operation.collection];
  const record = v.parse(schema, operation.record);
  if (record._id !== operation.id)
    throw new Error("Record ID differs from operation ID");
  for (const field of ["userId", "practiceId", "clientId", "practitionerId"])
    if (field in record) v.parse(canonicalId, Reflect.get(record, field));
  if ("date" in record && !(record.date instanceof Date))
    throw new Error("Wire dates must be instants");
  if ("bodyPoints" in record && record.bodyPoints)
    for (const side of [record.bodyPoints.front, record.bodyPoints.back])
      for (const point of side) {
        v.parse(canonicalId, point._id);
        if (point.treatmentId !== operation.id)
          throw new Error("Body point belongs to another treatment");
      }
  return {
    ...operation,
    record: {
      ...record,
      _id: operation.id,
      version: operation.baseVersion + 1,
      deletedAt: null,
    },
  } as Operation;
}
