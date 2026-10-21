import * as v from "valibot";
import { canonicalId } from "@/data/model";
import { pool } from "@/db/runtime";
import { isDatabaseActivated, unavailable } from "@/server/activation";
import { readSqlActor } from "@/server/sqlAuth";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!(await isDatabaseActivated())) return unavailable();
  const actor = await readSqlActor(request.headers);
  if (!actor?.admin) return new Response(null, { status: 403 });
  const cursor = new URL(request.url).searchParams.get("after");
  if (cursor && !v.safeParse(canonicalId, cursor).success)
    return new Response(null, { status: 400 });
  const { rows } = await pool.query(
    "select id,name,email,practitioner from auth_user where ($1::uuid is null or id>$1::uuid) order by id limit 101",
    [cursor],
  );
  const fresh = await readSqlActor(request.headers);
  if (!fresh?.admin || fresh.id !== actor.id)
    return new Response(null, { status: 403 });
  return Response.json(
    { users: rows.slice(0, 100), next: rows.length > 100 ? rows[99].id : null },
    { headers: { "Cache-Control": "private,no-store", Vary: "Cookie" } },
  );
}
