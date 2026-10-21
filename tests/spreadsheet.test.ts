import { describe, expect, it } from "vitest";
import { parseSpreadsheet } from "@/data/spreadsheet";
import { databaseClientConfig } from "@/db/connection";

describe("spreadsheet boundary", () => {
  it("preserves notes and accepts explicit timezone instants and empty trailing rows", () => {
    const [row] = parseSpreadsheet(
      "2026-10-21T10:30:00+01:00\tAki Smith Jones\t60\tself\t  初回 🌱  \r\n\n",
    );
    expect(row.date.toISOString()).toBe("2026-10-21T09:30:00.000Z");
    expect(row.notes).toBe("  初回 🌱  ");
    expect(row.clientName).toBe("Aki Smith Jones");
  });
  it("refuses invalid calendar dates, ambiguous formats, fractional minutes and unknown modalities before saving", () => {
    for (const line of [
      "2026-02-31\tAki\t60\tself",
      "2026-02-31T01:00:00Z\tAki\t60\tself",
      "21/10/2026\tAki\t60\tself",
      "2026-10-21\tAki\t60.5\tself",
      "2026-10-21\tAki\t0\tself",
      "2026-10-21\tAki\t60\tunknown",
    ])
      expect(() => parseSpreadsheet(line)).toThrow();
  });
});

it("keeps database TLS hostname verification and channel binding explicit, rejecting routing overrides", () => {
  const url =
    "postgresql://role:synthetic@ep-test.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  expect(databaseClientConfig(url)).toMatchObject({
    host: "ep-test.c-3.ap-southeast-1.aws.neon.tech",
    ssl: {
      rejectUnauthorized: true,
      servername: "ep-test.c-3.ap-southeast-1.aws.neon.tech",
    },
    bindingRequired: true,
    enableChannelBinding: true,
  });
  for (const invalid of [
    url + "&host=other.example",
    url + "&options=-csearch_path=evil",
    url.replace("sslmode=require", "sslmode=disable"),
    url.replace("ep-test.c-3.ap-southeast-1.aws.neon.tech", "127.0.0.1"),
    url + "#fragment",
  ])
    expect(() => databaseClientConfig(invalid)).toThrow();
});
