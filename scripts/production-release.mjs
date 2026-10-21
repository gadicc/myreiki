import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const target = Object.freeze({
  orgId: "team_csZisOffvMIGjgEuwRLc2eAX",
  projectId: "prj_4lUymF9XOiQJx1H6etvUmQ3Bk0Lg",
  publicOrigin: "https://myreiki.vercel.app",
});

/** Bind provider evidence to this project's exact artifact, owner and commit. */
export function verifyDeployment(value, origin, source, expectedId) {
  const url = new URL(origin);
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".vercel.app") ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid deployment origin");
  if (
    !/^[a-f\d]{40}$/.test(source ?? "") ||
    value.projectId !== target.projectId ||
    value.ownerId !== target.orgId ||
    value.readyState !== "READY" ||
    value.target !== "production" ||
    value.meta?.myreikiSourceSha !== source ||
    !/^dpl_[A-Za-z\d]+$/.test(value.id ?? "") ||
    (expectedId && value.id !== expectedId)
  )
    throw new Error("Deployment identity does not match the reviewed release");
  if (!expectedId && value.url !== url.hostname)
    throw new Error("Staged URL differs from the provider's immutable URL");
  return value.id;
}

async function providerDeployment(host) {
  if (
    process.env.VERCEL_ORG_ID !== target.orgId ||
    process.env.VERCEL_PROJECT_ID !== target.projectId ||
    !process.env.VERCEL_TOKEN
  )
    throw new Error("Release credential binding is missing or changed");
  const response = await fetch(
    `https://api.vercel.com/v13/deployments/${encodeURIComponent(host)}?teamId=${target.orgId}`,
    {
      headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok)
    throw new Error(`Deployment verification failed (${response.status})`);
  return await response.json();
}

async function readiness(origin, bypass, expectedReady = true) {
  const headers = { Accept: "application/json" };
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;
  const response = await fetch(`${origin}/api/ready`, {
    headers,
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  await verifyReadiness(response, expectedReady);
}

/** Distinguish a reachable migration fence from an activated database or protection HTML. */
export async function verifyReadiness(response, expectedReady) {
  if (
    response.status !== (expectedReady ? 200 : 503) ||
    !response.headers.get("content-type")?.includes("application/json") ||
    !response.headers.get("cache-control")?.includes("no-store") ||
    (await response.json()).ready !== expectedReady
  )
    throw new Error("The exact release origin did not pass database readiness");
}

async function main() {
  switch (process.argv[2]) {
    case "source": {
      const head = execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim();
      const changes = execFileSync(
        "git",
        ["status", "--porcelain", "--untracked-files=no"],
        { encoding: "utf8" },
      ).trim();
      if (
        head !== process.env.GITHUB_SHA ||
        changes ||
        process.env.GITHUB_REF !== "refs/heads/main"
      )
        throw new Error(
          "Release must use unchanged tracked main source at GITHUB_SHA",
        );
      return;
    }
    case "project": {
      const project = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
      if (
        project.orgId !== target.orgId ||
        project.projectId !== target.projectId ||
        process.env.VERCEL_ORG_ID !== target.orgId ||
        process.env.VERCEL_PROJECT_ID !== target.projectId
      )
        throw new Error("Vercel project link changed");
      return;
    }
    case "staged": {
      const origin = process.env.DEPLOYMENT_URL?.trim();
      const url = new URL(origin);
      // Validate the origin before using it for any network call or output.
      if (
        url.protocol !== "https:" ||
        !/^[a-z\d-]+\.vercel\.app$/.test(url.host) ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
      )
        throw new Error("Invalid staged deployment URL");
      const value = await providerDeployment(url.hostname);
      const id = verifyDeployment(value, origin, process.env.GITHUB_SHA);
      console.log(`deployment_id=${id}\ndeployment_url=${url.origin}`);
      return;
    }
    case "smoke": {
      const url = new URL(process.env.DEPLOYMENT_URL);
      if (
        url.protocol !== "https:" ||
        !/^[a-z\d-]+\.vercel\.app$/.test(url.host) ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
      )
        throw new Error("Invalid smoke origin");
      if (!process.env.VERCEL_AUTOMATION_BYPASS_SECRET)
        throw new Error(
          "Configure the reviewed staged-deployment protection credential before releasing",
        );
      const credentialSmoke = process.env.MYREIKI_CREDENTIAL_SMOKE === "true";
      await readiness(
        url.origin,
        process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
        !credentialSmoke,
      );
      if (credentialSmoke) {
        const response = await fetch(`${url.origin}/api/auth/get-session`, {
          headers: {
            "x-vercel-protection-bypass":
              process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          },
          redirect: "error",
          signal: AbortSignal.timeout(30_000),
        });
        if (
          response.status !== 503 ||
          !response.headers.get("content-type")?.includes("application/json") ||
          (await response.json()).error !== "MIGRATION_PENDING"
        )
          throw new Error(
            "Auth initialization did not reach the migration fence",
          );
      }
      return;
    }
    case "snapshot": {
      const value = await providerDeployment(
        new URL(target.publicOrigin).hostname,
      );
      if (
        value.projectId !== target.projectId ||
        !/^dpl_[A-Za-z\d]+$/.test(value.id)
      )
        throw new Error("Public alias binding changed");
      writeFileSync(
        process.argv[3],
        JSON.stringify({ projectId: value.projectId, id: value.id }),
        { flag: "wx", mode: 0o600 },
      );
      return;
    }
    case "unchanged": {
      const before = JSON.parse(readFileSync(process.argv[3], "utf8"));
      const current = await providerDeployment(
        new URL(target.publicOrigin).hostname,
      );
      if (
        before.projectId !== target.projectId ||
        current.projectId !== before.projectId ||
        current.id !== before.id
      )
        throw new Error(
          "The public deployment changed during staging; stop and inspect",
        );
      return;
    }
    case "live": {
      const value = await providerDeployment(
        new URL(target.publicOrigin).hostname,
      );
      verifyDeployment(
        value,
        target.publicOrigin,
        process.env.GITHUB_SHA,
        process.env.DEPLOYMENT_ID,
      );
      await readiness(target.publicOrigin);
      // Recheck after HTTP smoke in case another operator promoted concurrently.
      verifyDeployment(
        await providerDeployment(new URL(target.publicOrigin).hostname),
        target.publicOrigin,
        process.env.GITHUB_SHA,
        process.env.DEPLOYMENT_ID,
      );
      return;
    }
    default:
      throw new Error(
        "Use source|project|staged|smoke|snapshot|unchanged|live",
      );
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(() => {
    // Fetch/CLI errors can carry headers or credentials. Keep CI output bounded.
    console.error(
      "Production release guard failed. Inspect the step and provider state before retrying.",
    );
    process.exitCode = 1;
  });
}
