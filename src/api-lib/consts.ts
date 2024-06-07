export const DBNAME = "myreiki";
export const SITE_TITLE = "MyReiki";
export const DEV_PORT = 3000;
export const PROD_HOST = "myreiki.vercel.app";

export const ROOT_URL =
  process.env.ROOT_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://" + PROD_HOST
    : "http://localhost:" + DEV_PORT);

if (!process.env.NEXTAUTH_URL) process.env.NEXTAUTH_URL = ROOT_URL;
