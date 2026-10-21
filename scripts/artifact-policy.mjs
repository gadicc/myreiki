import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const privatePath = (path) =>
  path
    .split(/[\\/]/)
    .some(
      (part) =>
        part === ".private" ||
        (/^\.env(?:\.|$)/.test(part) && part !== ".env.example"),
    );
/** Vercel runtime receives secrets from its environment; local dotenv files must never ship. */
export async function verifyArtifactPolicy(directory) {
  const root = await realpath(directory),
    visited = new Set(),
    violations = [];
  async function visit(path) {
    const relative = path.slice(root.length + 1);
    if (privatePath(relative)) violations.push(relative);
    const actual = await realpath(path);
    if (actual !== root && !actual.startsWith(root + "/"))
      throw new Error("Artifact symlink escapes the standalone output");
    if (visited.has(actual)) return;
    visited.add(actual);
    if ((await stat(actual)).isDirectory()) {
      for (const name of await readdir(actual))
        await visit(actual + "/" + name);
    } else if (actual.endsWith("/.vc-config.json")) {
      const config = JSON.parse(await readFile(actual, "utf8"));
      for (const [destination, source] of Object.entries(
        config.filePathMap ?? {},
      ))
        if (
          privatePath(destination) ||
          (typeof source === "string" && privatePath(source))
        )
          violations.push(
            `${actual.slice(root.length + 1)} filePathMap:${destination}`,
          );
    }
  }
  await visit(root);
  if (violations.length)
    throw new Error(
      `Private environment files are present in the deployment: ${violations.join(", ")}`,
    );
  return { privateEnvironmentFiles: 0 };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  verifyArtifactPolicy(".vercel/output")
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
