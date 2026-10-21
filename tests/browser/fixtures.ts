import { test as base, expect } from "@playwright/test";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/node-postgres";
import { createDatabasePool } from "../../src/db/connection";
import { user } from "../../src/db/schema/auth";
import { createAppAuth } from "../../src/server/authFactory";

const origin = "http://127.0.0.1:3011";
export const test = base.extend<{
  login: (identity?: "A" | "B") => Promise<void>;
}>({
  login: async ({ context, page }, use) => {
    const url = process.env.DATABASE_URL_UNPOOLED;
    if (!url || !process.env.BETTER_AUTH_SECRET)
      throw new Error(
        "Run browser tests through loom env with the synthetic development database.",
      );
    // This harness is deliberately bound to the approved data-free development root.
    if (
      new URL(url).hostname !==
      "ep-summer-breeze-az0jgg8u.c-3.ap-southeast-1.aws.neon.tech"
    )
      throw new Error("Browser tests refuse every other database target.");
    const pool = createDatabasePool(url),
      database = drizzle(pool);
    const factory = createAppAuth({
      database,
      baseURL: origin,
      secret: process.env.BETTER_AUTH_SECRET,
      production: true,
    });
    // The privileged test plugin exists only in this Node test process. It adds
    // no HTTP endpoints and is never imported by the application runtime.
    const auth = betterAuth({
      ...factory.options,
      plugins: [...factory.options.plugins, testUtils()],
    });
    await use(async (identity = "A") => {
      const email = `myreiki-browser-${identity.toLowerCase()}@example.test`;
      const [owner] = await database
        .insert(user)
        .values({
          email,
          name: `Synthetic Browser ${identity}`,
          admin: false,
          practitioner: true,
        })
        .onConflictDoUpdate({
          target: user.email,
          set: { admin: false, practitioner: true },
        })
        .returning();
      const cookies = await (await auth.$context).test.getCookies({
        userId: owner.id,
        domain: "127.0.0.1",
      });
      await context.addCookies(
        cookies.map((cookie) => ({
          ...cookie,
          sameSite: cookie.sameSite ?? "Lax",
        })),
      );
      await page.goto("/practices");
      await expect(
        page.getByRole("button", { name: "account of current user" }),
      ).toBeVisible();
    });
    await pool.end();
  },
});
export { expect };
