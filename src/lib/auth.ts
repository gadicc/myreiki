import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";
import { DBNAME, DEV_PORT, ROOT_URL } from "@/api-lib/consts";

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1";
const mongoClient = new MongoClient(MONGO_URL);
const mongoDb = mongoClient.db(DBNAME);

const isProd = process.env.NODE_ENV === "production";
const devAuthBaseURL =
  process.env.BETTER_AUTH_DEV_URL ||
  process.env.DEV_ROOT_URL ||
  "http://localhost:" + DEV_PORT;
const authBaseURL = isProd
  ? process.env.BETTER_AUTH_URL || ROOT_URL
  : devAuthBaseURL;
const trustedOrigins = [
  authBaseURL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3006",
];

function toLegacyEmails(email?: string | null, emailVerified?: boolean) {
  if (!email) return [];
  return [{ value: email, verified: Boolean(emailVerified) }];
}

function toLegacyPhotos(image?: string | null) {
  if (!image) return [];
  return [{ value: image }];
}

export const auth = betterAuth({
  baseURL: authBaseURL,
  secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustedOrigins,
  database: mongodbAdapter(mongoDb, { usePlural: false }),
  user: {
    modelName: "users",
    additionalFields: {
      displayName: { type: "string", required: false },
      emails: { type: "json", required: false },
      photos: { type: "json", required: false },
      services: { type: "json", required: false },
      username: { type: "string", required: false },
      admin: { type: "boolean", required: false },
      practitioner: { type: "boolean", required: false },
      __updatedAt: { type: "number", required: false },
    },
  },
  session: {
    modelName: "sessions",
    fields: {
      token: "sessionToken",
      expiresAt: "expires",
      ipAddress: "ip",
    },
  },
  account: {
    modelName: "accounts",
    fields: {
      providerId: "provider",
      accountId: "providerAccountId",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
    },
    additionalFields: {
      type: { type: "string", required: false },
      tokenType: { type: "string", required: false, fieldName: "token_type" },
    },
  },
  verification: {
    modelName: "verification_tokens",
    fields: {
      value: "token",
      expiresAt: "expires",
    },
  },
  databaseHooks: {
    user: {
      create: {
        async before(user) {
          return {
            data: {
              displayName: user.name,
              emails: toLegacyEmails(user.email, user.emailVerified),
              photos: toLegacyPhotos(user.image),
              __updatedAt: Date.now(),
            },
          };
        },
      },
      update: {
        async before(user) {
          const patch: Record<string, unknown> = {
            __updatedAt: Date.now(),
          };
          if (typeof user.name === "string") patch.displayName = user.name;
          if (typeof user.email === "string")
            patch.emails = toLegacyEmails(user.email, user.emailVerified);
          if ("image" in user)
            patch.photos = toLegacyPhotos(
              typeof user.image === "string" ? user.image : null,
            );
          return { data: patch };
        },
      },
    },
    account: {
      create: {
        async before() {
          return {
            data: {
              type: "oauth",
              tokenType: "bearer",
            },
          };
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      mapProfileToUser(profile) {
        return {
          name: profile.name,
          email: profile.email,
          emailVerified: profile.email_verified,
          image: profile.picture,
          displayName: profile.name,
          emails: [{ value: profile.email, verified: profile.email_verified }],
          photos: profile.picture ? [{ value: profile.picture }] : [],
          services: [
            {
              service: "google",
              id: profile.sub,
              profile: {
                id: profile.sub,
                displayName: profile.name,
                name: {
                  familyName: profile.family_name,
                  givenName: profile.given_name,
                },
                emails: [
                  { value: profile.email, verified: profile.email_verified },
                ],
                photos: profile.picture ? [{ value: profile.picture }] : [],
                provider: "google",
                _json: profile,
              },
            },
          ],
        };
      },
    },
  },
  plugins: [nextCookies()],
  advanced: {
    cookiePrefix: "next-auth",
    cookies: {
      sessionToken: {
        name: "next-auth.session-token",
      },
    },
  },
});
