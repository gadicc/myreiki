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

export const auth = betterAuth({
  baseURL: authBaseURL,
  secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustedOrigins,
  database: mongodbAdapter(mongoDb),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
