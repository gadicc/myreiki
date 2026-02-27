export const DBNAME = "myreiki";
export const SITE_TITLE = "MyReiki";
export const DEV_PORT = Number(process.env.DEV_PORT || 3006);
export const PROD_HOST = "myreiki.vercel.app";

const DEV_ROOT_URL = process.env.DEV_ROOT_URL || "http://localhost:" + DEV_PORT;

const PROD_ROOT_URL = process.env.ROOT_URL || "https://" + PROD_HOST;

export const ROOT_URL =
  process.env.NODE_ENV === "production" ? PROD_ROOT_URL : DEV_ROOT_URL;

if (!process.env.NEXTAUTH_URL) process.env.NEXTAUTH_URL = ROOT_URL;
