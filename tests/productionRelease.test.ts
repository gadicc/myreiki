import { expect, it } from "vitest";
import {
  target,
  verifyDeployment,
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

it("accepts pending bootstrap only for credential smoke and requires activation for release", async () => {
  const response = (ready: boolean) =>
    Response.json(
      { ready },
      {
        status: ready ? 200 : 503,
        headers: { "Cache-Control": "private,no-store" },
      },
    );
  await expect(
    verifyReadiness(response(false), false),
  ).resolves.toBeUndefined();
  await expect(verifyReadiness(response(true), true)).resolves.toBeUndefined();
  await expect(verifyReadiness(response(false), true)).rejects.toThrow();
  await expect(verifyReadiness(response(true), false)).rejects.toThrow();
  await expect(
    verifyReadiness(new Response("Sign in to Vercel", { status: 200 }), false),
  ).rejects.toThrow();
});
