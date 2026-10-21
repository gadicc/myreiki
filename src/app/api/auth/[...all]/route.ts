import { toNextJsHandler } from "better-auth/next-js";
import { isDatabaseActivated, unavailable } from "@/server/activation";
import { sqlAuth } from "@/server/sqlAuth";

const handlers = toNextJsHandler(sqlAuth);
export const GET = async (request: Request) =>
  (await isDatabaseActivated()) ? handlers.GET(request) : unavailable();
export const POST = async (request: Request) =>
  (await isDatabaseActivated()) ? handlers.POST(request) : unavailable();
