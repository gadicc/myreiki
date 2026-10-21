import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import superjson from "superjson";
import type {
  OperationResult,
  Profile,
  RecordKind,
  Records,
  Snapshot,
} from "@/data/model";
import { parseOperation } from "@/data/model";

type Actor = { id: string; admin: boolean };
type Row = Record<string, unknown>;
const uuid = (value: unknown) => String(value);
const optional = (value: unknown) =>
  value == null ? undefined : String(value);
const instant = (value: unknown) =>
  value == null ? null : new Date(value as string | Date);

export class ServiceError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

function profile(row: Row): Profile {
  return {
    _id: uuid(row.id),
    displayName: String(row.name),
    email: String(row.email),
    image: row.image == null ? null : String(row.image),
    admin: row.admin === true,
    practitioner: row.practitioner === true,
  };
}

export function projectRecord<K extends RecordKind>(
  collection: K,
  row: Row,
): Records[K] {
  const common = {
    _id: uuid(row.id),
    version: Number(row.version),
    deletedAt: instant(row.deleted_at),
  };
  if (collection === "practices")
    return {
      ...common,
      userId: uuid(row.owner_id),
      name: String(row.name),
      countryId: optional(row.country_id),
      phone: optional(row.phone),
      email: optional(row.email),
      website: optional(row.website),
      notes: optional(row.notes),
    } as Records[K];
  if (collection === "clients")
    return {
      ...common,
      practiceId: uuid(row.practice_id),
      givenName: String(row.given_name),
      familyName: optional(row.family_name),
      phone: optional(row.phone),
      email: optional(row.email),
      notes: optional(row.notes),
      createdAt: instant(row.created_at) ?? undefined,
    } as Records[K];
  return {
    ...common,
    practiceId: uuid(row.practice_id),
    clientId: uuid(row.client_id),
    practitionerId: uuid(row.practitioner_id),
    date: instant(row.date)!,
    duration: Number(row.duration),
    type: row.type,
    ...(row.type === "reiki" ? { reiki: { type: row.reiki_type } } : {}),
    bodyPoints: row.body_points ?? undefined,
    notes: optional(row.notes),
  } as Records[K];
}

/** Full owner-scoped snapshot, including tombstones for deterministic offline reconciliation. */
export async function readPracticeSnapshot(
  connection: Pick<PoolClient, "query">,
  actor: Actor,
): Promise<Snapshot> {
  const {
    rows: [user],
  } = await connection.query(
    "select id,name,email,image,admin,practitioner from auth_user where id=$1",
    [actor.id],
  );
  if (!user) throw new ServiceError(401, "SESSION_REQUIRED");
  const practices = (
    await connection.query("select * from practices where owner_id=$1", [
      actor.id,
    ])
  ).rows;
  const clients = (
    await connection.query(
      "select c.* from clients c join practices p on p.id=c.practice_id where p.owner_id=$1",
      [actor.id],
    )
  ).rows;
  const treatments = (
    await connection.query(
      "select t.* from treatments t join practices p on p.id=t.practice_id where p.owner_id=$1",
      [actor.id],
    )
  ).rows;
  const {
    rows: [state],
  } = await connection.query(
    "select revision from practice_sync_state where owner_id=$1",
    [actor.id],
  );
  return {
    actor: profile(user),
    revision: Number(state?.revision ?? 0),
    practices: practices.map((r) => projectRecord("practices", r)),
    clients: clients.map((r) => projectRecord("clients", r)),
    treatments: treatments.map((r) => projectRecord("treatments", r)),
  };
}

const columns = {
  practices: {
    userId: "owner_id",
    name: "name",
    countryId: "country_id",
    phone: "phone",
    email: "email",
    website: "website",
    notes: "notes",
  },
  clients: {
    practiceId: "practice_id",
    givenName: "given_name",
    familyName: "family_name",
    phone: "phone",
    email: "email",
    notes: "notes",
    createdAt: "created_at",
  },
  treatments: {
    practiceId: "practice_id",
    clientId: "client_id",
    practitionerId: "practitioner_id",
    date: "date",
    duration: "duration",
    type: "type",
    reikiType: "reiki_type",
    bodyPoints: "body_points",
    notes: "notes",
  },
};

/** Owner checks, compare-and-swap and idempotency receipt share one locked transaction. */
export async function applyPracticeOperation(
  pool: Pick<Pool, "connect">,
  input: unknown,
  readActor: () => Promise<Actor | null>,
): Promise<OperationResult> {
  let operation: ReturnType<typeof parseOperation>;
  try {
    operation = parseOperation(input);
  } catch {
    throw new ServiceError(400, "INVALID_OPERATION");
  }
  const actor = await readActor();
  if (!actor || actor.id !== operation.actorId)
    throw new ServiceError(401, "ACCOUNT_CHANGED");
  const connection = await pool.connect();
  const hash = createHash("sha256")
    .update(superjson.stringify(operation))
    .digest("hex");
  try {
    await connection.query("begin");
    await connection.query("set local search_path=public,pg_temp");
    // Serialize each owner's operations, including first insert and receipt replay.
    const { rows: owner } = await connection.query(
      "select id from auth_user where id=$1 for update",
      [actor.id],
    );
    if (!owner.length) throw new ServiceError(401, "SESSION_REQUIRED");
    const { collection, id, record, baseVersion } = operation;
    const {
      rows: [existing],
    } = await connection.query(
      `select * from ${collection} where id=$1 for update`,
      [id],
    );
    const practiceId =
      collection === "practices"
        ? id
        : (existing?.practice_id ??
          (record && "practiceId" in record ? record.practiceId : null));
    const {
      rows: [practice],
    } = await connection.query(
      "select * from practices where id=$1 for update",
      [practiceId],
    );
    if (collection === "practices" && !existing) {
      if (
        operation.kind !== "save" ||
        !record ||
        !("userId" in record) ||
        record.userId !== actor.id
      )
        throw new ServiceError(403, "FORBIDDEN");
    } else if (!practice || practice.owner_id !== actor.id)
      throw new ServiceError(403, "FORBIDDEN");
    if (record && "practiceId" in record && record.practiceId !== practiceId)
      throw new ServiceError(403, "PARENT_IMMUTABLE");
    if (record && "userId" in record && record.userId !== actor.id)
      throw new ServiceError(403, "OWNER_IMMUTABLE");
    if (
      record &&
      "practitionerId" in record &&
      record.practitionerId !== actor.id
    )
      throw new ServiceError(403, "PRACTITIONER_IMMUTABLE");
    const {
      rows: [receipt],
    } = await connection.query(
      "select payload_hash,result from sync_receipts where owner_id=$1 and operation_id=$2",
      [actor.id, operation.operationId],
    );
    let result: OperationResult;
    if (receipt) {
      if (receipt.payload_hash !== hash)
        throw new ServiceError(409, "OPERATION_REUSED");
      // A retry cannot revive a record or reveal a now-revoked parent.
      if (
        (practice?.deleted_at &&
          !(collection === "practices" && operation.kind === "delete")) ||
        (existing?.deleted_at && operation.kind !== "delete")
      )
        throw new ServiceError(409, "RECORD_DELETED");
      result = superjson.deserialize(receipt.result);
    } else {
      if (practice?.deleted_at || existing?.deleted_at)
        throw new ServiceError(409, "RECORD_DELETED");
      if ((existing ? Number(existing.version) : 0) !== baseVersion)
        throw new ServiceError(409, "VERSION_CONFLICT");
      if (collection === "treatments" && record && "clientId" in record) {
        const {
          rows: [client],
        } = await connection.query(
          "select id from clients where id=$1 and practice_id=$2 and deleted_at is null for update",
          [record.clientId, practiceId],
        );
        if (!client) throw new ServiceError(403, "CLIENT_UNAVAILABLE");
      }
      let saved: Row;
      if (operation.kind === "delete") {
        const { rows } = await connection.query(
          `update ${collection} set deleted_at=now(),version=version+1 where id=$1 returning *`,
          [id],
        );
        saved = rows[0];
      } else {
        const data = { ...record } as Row;
        if (collection === "treatments")
          data.reikiType =
            "reiki" in data ? (data.reiki as { type: string }).type : null;
        const entries = Object.entries(columns[collection]);
        const values = entries.map(([property]) =>
          property === "bodyPoints"
            ? data[property] == null
              ? null
              : JSON.stringify(data[property])
            : (data[property] ?? null),
        );
        const names = entries.map(([, column]) => column);
        const params = names.map((_, i) => `$${i + 3}`);
        const statement = existing
          ? `update ${collection} set version=$2,${names.map((name, i) => `${name}=${params[i]}`).join(",")} where id=$1 returning *`
          : `insert into ${collection} (id,version,${names.join(",")}) values ($1,$2,${params.join(",")}) returning *`;
        const { rows } = await connection.query(statement, [
          id,
          baseVersion + 1,
          ...values,
        ]);
        saved = rows[0];
      }
      const {
        rows: [state],
      } = await connection.query(
        "insert into practice_sync_state (owner_id,revision) values ($1,1) on conflict (owner_id) do update set revision=practice_sync_state.revision+1 returning revision",
        [actor.id],
      );
      result = {
        ownerRevision: Number(state.revision),
        operationId: operation.operationId,
        collection,
        record: projectRecord(collection, saved),
      };
      await connection.query(
        "insert into sync_receipts (owner_id,operation_id,payload_hash,result) values ($1,$2,$3,$4)",
        [
          actor.id,
          operation.operationId,
          hash,
          JSON.stringify(superjson.serialize(result)),
        ],
      );
    }
    const current = await readActor();
    if (!current || current.id !== actor.id)
      throw new ServiceError(401, "ACCOUNT_CHANGED");
    await connection.query("commit");
    return result;
  } catch (error) {
    await connection.query("rollback");
    throw error;
  } finally {
    connection.release();
  }
}
