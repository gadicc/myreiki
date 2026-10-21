import type { Pool } from "pg";
import type { RecordKind } from "@/data/model";

/** Resolve retained source IDs only through records the current actor owns. */
export async function resolveLegacyAlias(
  pool: Pick<Pool, "query">,
  owner: string,
  collection: RecordKind,
  legacyId: string,
) {
  const parent = collection === "practices" ? "r" : "p";
  const join =
    collection === "practices" ? "" : "join practices p on p.id=r.practice_id";
  const { rows } = await pool.query(
    `select distinct a.canonical_id from legacy_aliases a
      join legacy_import i on i.singleton=true and i.status='complete' and i.source_hash=a.source
      join ${collection} r on r.id=a.canonical_id ${join}
      where a.collection=$1 and a.legacy_id=$2 and ${parent}.owner_id=$3
      and ${parent}.deleted_at is null and r.deleted_at is null limit 2`,
    [collection, legacyId, owner],
  );
  return rows.length === 1 ? String(rows[0].canonical_id) : null;
}
