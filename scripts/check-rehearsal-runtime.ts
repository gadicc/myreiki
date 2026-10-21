import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/node-postgres";
import superjson from "superjson";
import type { Snapshot } from "../src/data/model";
import { createDatabasePool } from "../src/db/connection";
import { executeImport } from "../src/migration/executor";
import type { ImportPlan } from "../src/migration/plan";
import { createAppAuth } from "../src/server/authFactory";

async function main() {
  if (!process.env.BETTER_AUTH_SECRET) throw new Error("Run through loom env");
  const env = Object.fromEntries(
    (await readFile(".private/neon-migration-rehearsal.env", "utf8"))
      .trim()
      .split("\n")
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), JSON.parse(line.slice(i + 1))];
      }),
  );
  const host = "ep-raspy-forest-azru6iy8.c-3.ap-southeast-1.aws.neon.tech";
  if (new URL(env.DATABASE_URL_UNPOOLED).hostname !== host)
    throw new Error("Private rehearsal target changed");
  const plan = superjson.parse<ImportPlan>(
    await readFile(".private/import-plan-v1.json", "utf8"),
  );
  const { planHash } = JSON.parse(
    await readFile(".private/import-plan-v1.json.receipt.json", "utf8"),
  );
  const pool = createDatabasePool(env.DATABASE_URL_UNPOOLED),
    origin = "http://127.0.0.1:3008";
  const factory = createAppAuth({
    database: drizzle(pool),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: origin,
    production: true,
  });
  const auth = betterAuth({
    ...factory.options,
    plugins: [...factory.options.plugins, testUtils()],
  });
  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--port",
      "3008",
      "--hostname",
      "127.0.0.1",
    ],
    {
      env: {
        ...process.env,
        ...env,
        BETTER_AUTH_URL: origin,
        LOOM_LOCAL_TEST_LOGIN: "0",
        VERCEL_ENV: "preview",
      },
      stdio: "ignore",
    },
  );
  const sessions: string[] = [];
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        if ((await fetch(`${origin}/api/ready`)).ok) break;
      } catch {}
      if (attempt === 99) throw new Error("Rehearsal server did not start");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const before = await pool.connect();
    try {
      await executeImport(before, plan, planHash);
    } finally {
      before.release();
    }
    browser = await chromium.launch({
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? "/usr/bin/chromium",
    });
    let checkedBodyPoints = false;
    for (const owner of plan.users) {
      const context = await browser.newContext({ serviceWorkers: "block" });
      try {
        const cookies = await (await auth.$context).test.getCookies({
          userId: owner.id!,
          domain: "127.0.0.1",
        });
        sessions.push(
          ...(
            await pool.query("select id from auth_session where user_id=$1", [
              owner.id,
            ])
          ).rows.map((row) => row.id),
        );
        await context.addCookies(
          cookies.map((cookie) => ({
            ...cookie,
            sameSite: cookie.sameSite ?? "Lax",
          })),
        );
        const response = await context.request.get(`${origin}/api/data`);
        assert.equal(response.status(), 200);
        assert(response.headers()["cache-control"].includes("no-store"));
        const data = superjson.parse<Snapshot>(await response.text());
        assert.equal(data.actor._id, owner.id);
        assert.equal(data.actor.admin, owner.admin);
        assert.equal(data.actor.practitioner, owner.practitioner);
        const practices = plan.practices.filter((p) => p.ownerId === owner.id),
          practiceIds = new Set(practices.map((p) => p.id));
        const clients = plan.clients.filter((c) =>
            practiceIds.has(c.practiceId),
          ),
          treatments = plan.treatments.filter((t) =>
            practiceIds.has(t.practiceId),
          );
        assert.deepEqual(
          data.practices.map((p) => p._id).sort(),
          practices.map((p) => p.id).sort(),
        );
        assert.deepEqual(
          data.clients.map((c) => c._id).sort(),
          clients.map((c) => c.id).sort(),
        );
        assert.deepEqual(
          data.treatments.map((t) => t._id).sort(),
          treatments.map((t) => t.id).sort(),
        );
        for (const row of data.treatments) {
          const expected = treatments.find((t) => t.id === row._id)!;
          assert.equal((row.date as Date).getTime(), expected.date.getTime());
          assert.equal(row.notes, expected.notes ?? undefined);
          assert.equal(row.clientId, expected.clientId);
          assert.equal(row.duration, expected.duration);
          assert.deepEqual(row.bodyPoints, expected.bodyPoints ?? undefined);
        }
        const treatment = treatments.find((t) => t.bodyPoints);
        if (treatment) {
          const oldAlias = plan.aliases.find(
            (alias) =>
              alias.collection === "treatments" &&
              alias.canonicalId === treatment.id,
          )!;
          const resolved = await context.request.get(
            `${origin}/api/data/legacy?${new URLSearchParams({ owner: owner.id!, collection: "treatments", id: oldAlias.legacyId })}`,
          );
          assert.equal(resolved.status(), 200);
          assert.equal((await resolved.json()).id, treatment.id);
          const page = await context.newPage();
          await page.goto(
            `${origin}/treatment/edit/${encodeURIComponent(oldAlias.legacyId)}`,
          );
          const notes = page.getByRole("textbox", {
            name: "Notes",
            exact: true,
          });
          await notes.waitFor();
          assert.equal(await notes.inputValue(), treatment.notes ?? "");
          for (const [side, points] of Object.entries(treatment.bodyPoints!))
            for (let i = 0; i < points.length; i++)
              assert.equal(
                await page
                  .getByText(`${side[0].toUpperCase()}${i + 1}`, {
                    exact: true,
                  })
                  .count(),
                1,
              );
          checkedBodyPoints = true;
        }
      } finally {
        await context.close();
      }
    }
    assert(checkedBodyPoints);
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
    if (sessions.length)
      await pool.query("delete from auth_session where id=any($1::uuid[])", [
        sessions,
      ]);
    const after = await pool.connect();
    try {
      await executeImport(after, plan, planHash);
    } finally {
      after.release();
      await pool.end();
    }
  }
  const result = {
    verifiedAt: new Date().toISOString(),
    target: "protected-rehearsal",
    existingOwners: plan.users.length,
    ownerIsolation: true,
    exactTreatmentProjection: true,
    renderedExistingBodyPoints: true,
    legacyBookmark: true,
    sessionCleanupAndExactReplay: true,
  };
  await writeFile(
    `.private/runtime-${randomUUID()}.json`,
    JSON.stringify(result, null, 2),
    { mode: 0o600, flag: "wx" },
  );
  console.log(JSON.stringify(result));
}
main().catch(() => {
  console.error(
    "Protected runtime check failed; inspect private state before retrying. No patient output was logged.",
  );
  process.exitCode = 1;
});
