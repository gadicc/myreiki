import { afterEach, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/db/runtime", () => ({ pool: { query } }));

import { isDatabaseActivated, unavailable } from "@/server/activation";

afterEach(() => {
  vi.unstubAllEnvs();
  query.mockReset();
});
it("keeps Production auth and records locked until the exact reviewed import completes", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("MYREIKI_IMPORT_PLAN_SHA256", "");
  expect(await isDatabaseActivated()).toBe(false);
  expect(query).not.toHaveBeenCalled();
  const hash = "a".repeat(64);
  vi.stubEnv("MYREIKI_IMPORT_PLAN_SHA256", hash);
  for (const receipt of [
    undefined,
    { plan_hash: hash, status: "prepared" },
    { plan_hash: "b".repeat(64), status: "complete" },
  ]) {
    query.mockResolvedValueOnce({ rows: receipt ? [receipt] : [] });
    expect(await isDatabaseActivated()).toBe(false);
  }
  query.mockRejectedValueOnce(new Error("not migrated"));
  expect(await isDatabaseActivated()).toBe(false);
  query.mockResolvedValueOnce({
    rows: [{ plan_hash: hash, status: "complete" }],
  });
  expect(await isDatabaseActivated()).toBe(true);
  const response = unavailable();
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("permits the independent synthetic development and preview roots", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  expect(await isDatabaseActivated()).toBe(true);
  expect(query).not.toHaveBeenCalled();
});
