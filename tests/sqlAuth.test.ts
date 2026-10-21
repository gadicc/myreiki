import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { account, user } from "@/db/schema/auth";
import { uuidV7 } from "@/lib/uuid";
import { createAppAuth } from "@/server/authFactory";
import { client, db } from "./memory-pglite";

const base = "http://localhost:3006";
const cookies = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
afterEach(() => vi.unstubAllGlobals());

describe("actual SQL auth factory with only Google network stubbed", () => {
  it("keeps the imported provider binding, rejects email-based linking and client grants, and revokes sessions", async () => {
    const id = uuidV7();
    await db.insert(user).values({
      id,
      name: "Imported",
      email: "registered@example.test",
      practitioner: false,
    });
    await db.insert(account).values({
      userId: id,
      providerId: "google",
      accountId: "legacy-subject",
    });
    const auth = createAppAuth({
      database: db,
      secret: "synthetic-test-secret-with-at-least-32-characters",
      baseURL: base,
      production: true,
      google: { clientId: "test-client", clientSecret: "test-only" },
    });
    const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwk = {
      ...keys.publicKey.export({ format: "jwk" }),
      kid: "synthetic",
      alg: "RS256",
      use: "sig",
    };
    let subject = "legacy-subject",
      nonce: string | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url === "https://www.googleapis.com/oauth2/v3/certs")
          return Response.json({ keys: [jwk] });
        if (url === "https://oauth2.googleapis.com/token") {
          const now = Math.floor(Date.now() / 1000);
          const encode = (value: unknown) =>
            Buffer.from(JSON.stringify(value)).toString("base64url");
          const payload = `${encode({ alg: "RS256", kid: "synthetic" })}.${encode({ iss: "https://accounts.google.com", aud: "test-client", sub: subject, email: "registered@example.test", email_verified: true, name: "Google name", iat: now, exp: now + 300, ...(nonce ? { nonce } : {}) })}`;
          return Response.json({
            access_token: "synthetic-access-token",
            token_type: "Bearer",
            expires_in: 300,
            id_token: `${payload}.${sign("RSA-SHA256", Buffer.from(payload), keys.privateKey).toString("base64url")}`,
          });
        }
        throw new Error("Unexpected external provider URL in auth test");
      }),
    );
    async function login() {
      const start = await auth.handler(
        new Request(`${base}/api/auth/sign-in/social`, {
          method: "POST",
          headers: { Origin: base, "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "google",
            callbackURL: `${base}/treatments`,
          }),
        }),
      );
      expect(start.status).toBe(200);
      const url = new URL((await start.json()).url);
      nonce = url.searchParams.get("nonce");
      return await auth.handler(
        new Request(
          `${base}/api/auth/callback/google?code=test-code&state=${encodeURIComponent(url.searchParams.get("state")!)}`,
          { headers: { Cookie: cookies(start) } },
        ),
      );
    }
    const signedIn = await login();
    expect(signedIn.headers.get("location")).toBe(`${base}/treatments`);
    const headers = new Headers({ Cookie: cookies(signedIn), Origin: base });
    const fresh = await auth.api.getSession({
      headers,
      query: { disableCookieCache: true, disableRefresh: true },
    });
    expect(fresh?.user.id).toBe(id);
    expect(fresh?.session.id).toMatch(/^[a-f\d-]{14}7/);
    await auth.handler(
      new Request(`${base}/api/auth/update-user`, {
        method: "POST",
        headers: {
          ...Object.fromEntries(headers),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          admin: true,
          practitioner: true,
          name: "Allowed name change",
        }),
      }),
    );
    const stored = (
      await client.query<{ admin: boolean; practitioner: boolean }>(
        "select admin,practitioner from auth_user where id=$1",
        [id],
      )
    ).rows[0];
    expect(stored).toEqual({ admin: false, practitioner: false });
    subject = "different-subject-same-email";
    const rejected = await login();
    expect(rejected.headers.get("location")).toContain("error=");
    expect(
      (await client.query("select * from auth_account where user_id=$1", [id]))
        .rows,
    ).toHaveLength(1);
    await auth.handler(
      new Request(`${base}/api/auth/sign-out`, { method: "POST", headers }),
    );
    expect(
      await auth.api.getSession({
        headers,
        query: { disableCookieCache: true, disableRefresh: true },
      }),
    ).toBeNull();
  });
});
