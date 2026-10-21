/** Production and Preview must never inherit a local development callback. */
export function authOrigin(env: Record<string, string | undefined>) {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL;
  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) {
    if (!/^[a-z\d-]+\.vercel\.app$/.test(env.VERCEL_URL))
      throw new Error("Invalid Preview auth host");
    return `https://${env.VERCEL_URL}`;
  }
  return env.NODE_ENV === "production"
    ? "https://myreiki.vercel.app"
    : env.BETTER_AUTH_DEV_URL || "http://localhost:3006";
}
