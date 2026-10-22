import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createGithubActionsOidcFetch } from "@gadicc/loom/release";

export const target = Object.freeze({
  orgId: "team_csZisOffvMIGjgEuwRLc2eAX",
  projectId: "prj_4lUymF9XOiQJx1H6etvUmQ3Bk0Lg",
  publicOrigin: "https://www.myreiki.app",
});

/** Bind provider evidence to this project's exact artifact, owner and commit. */
export function verifyDeployment(value, origin, source, expectedId) {
  const url = new URL(origin);
  if (
    url.protocol !== "https:" ||
    (expectedId
      ? url.origin !== target.publicOrigin
      : !/^[a-z\d-]+\.vercel\.app$/.test(url.hostname)) ||
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

async function readiness(origin) {
  const response = await fetch(`${origin}/api/ready`, {
    headers: { Accept: "application/json" },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  await verifyReadiness(response);
}

/** Distinguish a reachable migration fence from an activated database or protection HTML. */
export async function verifyReadiness(response) {
  if (
    response.status !== 200 ||
    !response.headers.get("content-type")?.includes("application/json") ||
    !response.headers.get("cache-control")?.includes("no-store") ||
    (await response.json()).ready !== true
  )
    throw new Error("The exact release origin did not pass database readiness");
}

/** Vercel protection redirects must identify its login gate and our exact request. */
export async function verifyProtectionDenial(response, origin) {
  if (response.status !== 302 && response.status !== 307)
    throw new Error("Expected Vercel protection login redirect");
  const location = new URL(response.headers.get("location") ?? "", origin);
  if (
    location.origin !== "https://vercel.com" ||
    location.pathname !== "/sso-api" ||
    location.searchParams.get("url") !== `${origin}/api/ready`
  )
    throw new Error("Unexpected protection denial destination");
  await response.body?.cancel();
}

function oidcFetch(origin, audience = "https://github.com/gadicc") {
  return createGithubActionsOidcFetch({
    origin,
    audience,
    env: process.env,
    writeWorkflowCommand: (command) => console.log(command),
  });
}

/** Deployment protection access does not grant an application session. */
export async function checkOidcReadiness(origin, check = oidcFetch(origin)) {
  const readiness = await check("/api/ready");
  console.log(
    `OIDC readiness: HTTP ${readiness.status}, JSON=${readiness.headers.get("content-type")?.includes("application/json") === true}, no-store=${readiness.headers.get("cache-control")?.includes("no-store") === true}`,
  );
  await verifyReadiness(readiness);
  const session = await check("/api/auth/get-session");
  console.log(`OIDC anonymous session: HTTP ${session.status}`);
  if (
    session.status !== 200 ||
    !session.headers.get("content-type")?.includes("application/json") ||
    (await session.json()) !== null
  )
    throw new Error("OIDC must leave the application session anonymous");
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
      const origin = process.env.DEPLOYMENT_URL?.trim();
      const value = await providerDeployment(new URL(origin).hostname);
      verifyDeployment(value, origin, process.env.GITHUB_SHA);
      await checkOidcReadiness(origin);
      return;
    }
    case "oidc-target": {
      // Read-only acceptance deliberately tests the current live artifact, not a
      // new deployment of the workflow commit. Never migrate or promote here.
      const value = await providerDeployment(
        new URL(target.publicOrigin).hostname,
      );
      const origin = `https://${value.url}`;
      verifyDeployment(value, origin, value.meta?.myreikiSourceSha);
      verifyDeployment(
        value,
        target.publicOrigin,
        value.meta?.myreikiSourceSha,
        value.id,
      );
      if (
        verifyDeployment(
          await providerDeployment(new URL(origin).hostname),
          origin,
          value.meta.myreikiSourceSha,
        ) !== value.id
      )
        throw new Error("Immutable artifact changed");
      console.log(`deployment_url=${origin}\ndeployment_id=${value.id}`);
      return;
    }
    case "oidc-accept": {
      const origin = process.env.DEPLOYMENT_URL;
      const value = await providerDeployment(new URL(origin).hostname);
      verifyDeployment(value, origin, value.meta?.myreikiSourceSha);
      if (value.id !== process.env.DEPLOYMENT_ID)
        throw new Error("Acceptance artifact changed");
      verifyDeployment(
        await providerDeployment(new URL(target.publicOrigin).hostname),
        target.publicOrigin,
        value.meta.myreikiSourceSha,
        value.id,
      );
      await verifyProtectionDenial(
        await fetch(`${origin}/api/ready`, {
          redirect: "manual",
          signal: AbortSignal.timeout(30_000),
        }),
        origin,
      );
      console.log(
        "Anonymous protection denial verified; checking GitHub identity.",
      );
      await checkOidcReadiness(origin);
      console.log(
        "Valid OIDC readiness and anonymous application session verified.",
      );
      const wrongAudience = oidcFetch(
        origin,
        "https://github.com/gadicc/myreiki-denied-audience",
      );
      await verifyProtectionDenial(await wrongAudience("/api/ready"), origin);
      verifyDeployment(
        await providerDeployment(new URL(target.publicOrigin).hostname),
        target.publicOrigin,
        value.meta.myreikiSourceSha,
        value.id,
      );
      console.log(
        "OIDC accepted; anonymous and wrong-audience requests denied; application session remains anonymous; public artifact unchanged.",
      );
      return;
    }
    case "oidc-deny-no-environment": {
      // This job has no Production environment or provider/application secrets.
      const origin = process.env.DEPLOYMENT_URL;
      if (!/^https:\/\/[a-z\d-]+\.vercel\.app$/.test(origin ?? ""))
        throw new Error("Invalid denial-check origin");
      await verifyProtectionDenial(
        await oidcFetch(origin)("/api/ready"),
        origin,
      );
      console.log("GitHub identity without the Production environment denied.");
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
        "Use source|project|staged|smoke|snapshot|unchanged|live|oidc-target|oidc-accept|oidc-deny-no-environment",
      );
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    // Fetch/CLI errors can carry headers or credentials. Keep CI output bounded.
    console.error(
      "Production release guard failed. Inspect the step and provider state before retrying.",
    );
    // Only known library messages are safe to disclose; never print arbitrary causes.
    const safeMessages = new Set([
      "GitHub OIDC token acquisition failed",
      "GitHub OIDC requires a verified HTTPS origin, audience and Actions identity endpoint",
      "OIDC deployment HTTP check failed",
    ]);
    if (error instanceof Error && safeMessages.has(error.message))
      console.error(error.message);
    process.exitCode = 1;
  });
}
