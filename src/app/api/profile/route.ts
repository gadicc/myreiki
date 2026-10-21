import * as v from "valibot";
import { canonicalId } from "@/data/model";
import { pool } from "@/db/runtime";
import { isDatabaseActivated, unavailable } from "@/server/activation";
import { isSameOriginRequest } from "@/server/sameOrigin";
import { readSqlActor } from "@/server/sqlAuth";

export async function PATCH(request: Request) {
  if (!(await isDatabaseActivated())) return unavailable();
  const reply = (status: number) =>
    new Response(null, {
      status,
      headers: { "Cache-Control": "private,no-store" },
    });
  if (!isSameOriginRequest(request)) return reply(403);
  let input: { expectedActorId: string; practitioner: boolean };
  try {
    const text = await request.text();
    if (text.length > 1024) return reply(413);
    input = v.parse(
      v.strictObject({
        expectedActorId: canonicalId,
        practitioner: v.boolean(),
      }),
      JSON.parse(text),
    );
  } catch {
    return reply(400);
  }
  const actor = await readSqlActor(request.headers);
  if (!actor || actor.id !== input.expectedActorId) return reply(401);
  const connection = await pool.connect();
  try {
    await connection.query("begin");
    await connection.query(
      "update auth_user set practitioner=$2,updated_at=now() where id=$1",
      [actor.id, input.practitioner],
    );
    await connection.query(
      "insert into practice_sync_state (owner_id,revision) values ($1,1) on conflict (owner_id) do update set revision=practice_sync_state.revision+1",
      [actor.id],
    );
    if ((await readSqlActor(request.headers))?.id !== actor.id) {
      await connection.query("rollback");
      return reply(401);
    }
    await connection.query("commit");
    return reply(204);
  } catch {
    await connection.query("rollback");
    return reply(500);
  } finally {
    connection.release();
  }
}
