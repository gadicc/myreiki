import { expect, it } from "vitest";
import { isSameOriginRequest } from "@/server/sameOrigin";

it("accepts the browser's actual loopback HTTP authority when Next normalizes its URL", () => {
  expect(
    isSameOriginRequest(
      new Request("http://localhost:3006/api/data", {
        headers: { host: "127.0.0.1:3006", origin: "http://127.0.0.1:3006" },
      }),
    ),
  ).toBe(true);
  expect(
    isSameOriginRequest(
      new Request("https://myreiki.vercel.app/api/data", {
        headers: {
          host: "myreiki.vercel.app",
          origin: "https://myreiki.vercel.app",
        },
      }),
    ),
  ).toBe(true);
});
it("rejects cross-site, cross-port, missing and malformed origins without trusting forwarded-host", () => {
  for (const origin of [
    undefined,
    "null",
    "https://evil.example",
    "http://localhost:3008",
    "https://localhost:3006",
    "http://localhost:3006/path",
  ])
    expect(
      isSameOriginRequest(
        new Request("http://localhost:3006/api/data", {
          headers: {
            host: "localhost:3006",
            "x-forwarded-host": "evil.example",
            ...(origin ? { origin } : {}),
          },
        }),
      ),
    ).toBe(false);
});
