import {
  createBetterAuthLocalDevelopmentConfig,
  createBetterAuthSessionConfig,
} from "@gadicc/loom/next/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { account, session, user, verification } from "@/db/schema/auth";
import { uuidV7 } from "@/lib/uuid";

/** SQL auth factory shared by the actual runtime and isolated provider-boundary tests. */
export function createAppAuth(options: {
  database: Parameters<typeof drizzleAdapter>[0];
  secret: string;
  baseURL: string;
  production: boolean;
  localTestLogin?: boolean;
  google?: { clientId: string; clientSecret: string };
}) {
  return betterAuth({
    ...(options.production
      ? { baseURL: options.baseURL }
      : createBetterAuthLocalDevelopmentConfig({ fallback: options.baseURL })),
    secret: options.secret,
    database: drizzleAdapter(options.database, {
      provider: "pg",
      schema: { user, session, account, verification },
      transaction: true,
    }),
    session: createBetterAuthSessionConfig(),
    emailAndPassword: {
      enabled: options.localTestLogin === true && !options.production,
      disableSignUp: true,
    },
    user: {
      additionalFields: {
        admin: { type: "boolean", defaultValue: false, input: false },
        practitioner: { type: "boolean", defaultValue: false, input: false },
      },
    },
    account: { accountLinking: { enabled: false } },
    socialProviders: options.google ? { google: options.google } : {},
    advanced: { database: { generateId: () => uuidV7() } },
    plugins: [nextCookies()],
  });
}
