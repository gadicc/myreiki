import { expect, it } from "vitest";
import {
  checkOidcReadiness,
  target,
  verifyDeployment,
  verifyProtectionDenial,
  verifyReadiness,
} from "../scripts/production-release.mjs";

it("binds the staged and promoted artifact to the exact org, project, source and immutable URL", () => {
  const sha = "a".repeat(40);
  const origin = "https://myreiki-synthetic.vercel.app";
  const deployment = {
    id: "dpl_Synthetic",
    url: new URL(origin).hostname,
    ownerId: target.orgId,
    projectId: target.projectId,
    readyState: "READY",
    target: "production",
    meta: { myreikiSourceSha: sha },
  };
  expect(verifyDeployment(deployment, origin, sha)).toBe(deployment.id);
  expect(
    verifyDeployment(deployment, target.publicOrigin, sha, deployment.id),
  ).toBe(deployment.id);
  for (const patch of [
    { ownerId: "team_other" },
    { projectId: "prj_other" },
    { readyState: "BUILDING" },
    { target: "preview" },
    { meta: { myreikiSourceSha: "b".repeat(40) } },
    { url: "another.vercel.app" },
  ])
    expect(() =>
      verifyDeployment({ ...deployment, ...patch }, origin, sha),
    ).toThrow();
  // Promotion accepts only the canonical custom origin with the exact ID.
  for (const origin of [
    "https://myreiki.app",
    "https://other.myreiki.app",
    "https://www.myreiki.app.evil.test",
    "https://another.vercel.app",
    "https://www.myreiki.app:8443",
    "https://www.myreiki.app/path",
    "https://www.myreiki.app?x=1",
    "https://www.myreiki.app#fragment",
  ])
    expect(() =>
      verifyDeployment(deployment, origin, sha, deployment.id),
    ).toThrow();
  expect(() =>
    verifyDeployment(deployment, target.publicOrigin, sha, "dpl_Other"),
  ).toThrow();
  for (const url of [
    "https://example.com",
    "https://www.myreiki.app@evil.test",
    "https://myreiki.vercel.app/path",
    "https://myreiki.vercel.app?x=1",
  ])
    expect(() => verifyDeployment(deployment, url, sha)).toThrow();
});

it("requires the activated database and rejects bootstrap fences or protection HTML", async () => {
  const response = (ready: boolean) =>
    Response.json(
      { ready },
      {
        status: ready ? 200 : 503,
        headers: { "Cache-Control": "private,no-store" },
      },
    );
  await expect(verifyReadiness(response(true))).resolves.toBeUndefined();
  await expect(verifyReadiness(response(false))).rejects.toThrow();
  await expect(
    verifyReadiness(new Response("Sign in to Vercel", { status: 200 })),
  ).rejects.toThrow();
});

it("recognizes the exact Vercel login gate rather than accepting an arbitrary failure", async () => {
  const origin = "https://myreiki-synthetic.vercel.app";
  const denied = (
    status: number,
    destination = `https://vercel.com/sso-api?url=${encodeURIComponent(`${origin}/api/ready`)}&nonce=synthetic`,
  ) => new Response(null, { status, headers: { location: destination } });
  await expect(
    verifyProtectionDenial(denied(302), origin),
  ).resolves.toBeUndefined();
  for (const response of [
    denied(200),
    denied(500),
    denied(302, "https://evil.test/sso-api"),
    denied(
      302,
      "https://vercel.com/sso-api?url=https%3A%2F%2Fother.vercel.app%2Fapi%2Fready",
    ),
  ])
    await expect(verifyProtectionDenial(response, origin)).rejects.toThrow();
});

it("requires an active database and an anonymous application session after OIDC access", async () => {
  const origin = "https://myreiki-synthetic.vercel.app";
  const paths: string[] = [];
  const response = (path: string, session: unknown = null) =>
    path === "/api/ready"
      ? Response.json(
          { ready: true },
          { headers: { "Cache-Control": "private,no-store" } },
        )
      : Response.json(session);
  await checkOidcReadiness(origin, async (path: string | URL) => {
    paths.push(String(path));
    return response(String(path));
  });
  expect(paths).toEqual(["/api/ready", "/api/auth/get-session"]);
  await expect(
    checkOidcReadiness(origin, async (path: string | URL) =>
      response(String(path), { user: { id: "synthetic" } }),
    ),
  ).rejects.toThrow("anonymous");
  await expect(
    checkOidcReadiness(origin, async () =>
      Response.json(
        { ready: false },
        { status: 503, headers: { "Cache-Control": "private,no-store" } },
      ),
    ),
  ).rejects.toThrow("readiness");
});
