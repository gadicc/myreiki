import superjson from "superjson";
import { pool } from "@/db/runtime";
import { isDatabaseActivated, unavailable } from "@/server/activation";
import {
  applyPracticeOperation,
  readPracticeSnapshot,
  ServiceError,
} from "@/server/practiceService";
import { isSameOriginRequest } from "@/server/sameOrigin";
import { readSqlActor } from "@/server/sqlAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (value: unknown, status = 200) =>
  new Response(superjson.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private,no-store",
      Vary: "Cookie",
    },
  });
const failure = (error: unknown) =>
  error instanceof ServiceError
    ? response({ error: error.code }, error.status)
    : response({ error: "REQUEST_FAILED" }, 500);

export async function GET(request: Request) {
  if (!(await isDatabaseActivated())) return unavailable();
  try {
    const actor = await readSqlActor(request.headers);
    if (!actor) return response({ actor: null });
    const client = await pool.connect();
    try {
      await client.query("begin isolation level repeatable read read only");
      const snapshot = await readPracticeSnapshot(client, actor);
      const fresh = await readSqlActor(request.headers);
      if (!fresh || fresh.id !== actor.id)
        throw new ServiceError(401, "ACCOUNT_CHANGED");
      await client.query("commit");
      return response(snapshot);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  if (!(await isDatabaseActivated())) return unavailable();
  if (
    !isSameOriginRequest(request) ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return response({ error: "ORIGIN_REQUIRED" }, 403);
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 128 * 1024)
      throw new ServiceError(413, "OPERATION_TOO_LARGE");
    let input: unknown;
    try {
      input = superjson.parse(text);
    } catch {
      throw new ServiceError(400, "INVALID_OPERATION");
    }
    return response(
      await applyPracticeOperation(pool, input, () =>
        readSqlActor(request.headers),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
