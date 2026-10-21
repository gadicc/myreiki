import * as v from "valibot";
import { canonicalId } from "@/data/model";
import { pool } from "@/db/runtime";
import { isDatabaseActivated, unavailable } from "@/server/activation";
import { resolveLegacyAlias } from "@/server/legacyAlias";
import { readSqlActor } from "@/server/sqlAuth";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!(await isDatabaseActivated())) return unavailable();
  const reply = (value: unknown, status = 200) =>
    Response.json(value, {
      status,
      headers: { "Cache-Control": "private,no-store", Vary: "Cookie" },
    });
  const parsed = v.safeParse(
    v.strictObject({
      owner: canonicalId,
      collection: v.picklist(["practices", "clients", "treatments"]),
      id: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
    }),
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return reply({ id: null }, 400);
  try {
    const actor = await readSqlActor(request.headers);
    if (!actor || actor.id !== parsed.output.owner)
      return reply({ id: null }, 401);
    const id = await resolveLegacyAlias(
      pool,
      actor.id,
      parsed.output.collection,
      parsed.output.id,
    );
    if ((await readSqlActor(request.headers))?.id !== actor.id)
      return reply({ id: null }, 401);
    return reply({ id });
  } catch {
    return reply({ id: null }, 500);
  }
}
