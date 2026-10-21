import { expect, it } from "vitest";
import { authOrigin } from "@/server/authOrigin";

it("separates public Production, deployed Preview and local callback origins", () => {
  expect(
    authOrigin({
      NODE_ENV: "development",
      BETTER_AUTH_DEV_URL: "http://localhost:3006",
    }),
  ).toBe("http://localhost:3006");
  expect(
    authOrigin({
      NODE_ENV: "production",
      BETTER_AUTH_DEV_URL: "http://localhost:3006",
    }),
  ).toBe("https://www.myreiki.app");
  expect(
    authOrigin({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_URL: "myreiki-synthetic.vercel.app",
    }),
  ).toBe("https://myreiki-synthetic.vercel.app");
  expect(
    authOrigin({
      NODE_ENV: "production",
      BETTER_AUTH_URL: "http://127.0.0.1:3011",
    }),
  ).toBe("http://127.0.0.1:3011");
  expect(() =>
    authOrigin({
      VERCEL_ENV: "preview",
      VERCEL_URL: "www.myreiki.app@evil.test",
    }),
  ).toThrow();
});
