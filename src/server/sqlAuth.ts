import "server-only";
import {
  isBetterAuthLocalTestLoginEnabled,
  requireBetterAuthSecret,
} from "@gadicc/loom/next/auth";
import { db } from "@/db/runtime";
import { createAppAuth } from "./authFactory";
import { authOrigin } from "./authOrigin";

export const sqlAuth = createAppAuth({
  database: db,
  secret: requireBetterAuthSecret(),
  baseURL: authOrigin(process.env),
  production: process.env.NODE_ENV === "production",
  localTestLogin: isBetterAuthLocalTestLoginEnabled(process.env),
  google:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }
      : undefined,
});

/** Every authorization read bypasses both cookie caches and session extension. */
export async function readSqlActor(headers: Headers) {
  const session = await sqlAuth.api.getSession({
    headers: new Headers(headers),
    query: { disableCookieCache: true, disableRefresh: true },
  });
  if (!session || session.session.expiresAt.getTime() <= Date.now())
    return null;
  return { id: session.user.id, admin: session.user.admin === true };
}
