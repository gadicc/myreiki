import { execFileSync } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import { digest } from "./source";

/** Bind the complete nonignored checkout, including deletions and new source, to a review. */
export async function checkoutArtifact() {
  const names = [
    ...new Set(
      execFileSync(
        "git",
        ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        { encoding: "utf8" },
      )
        .split("\0")
        .filter(Boolean),
    ),
  ].sort();
  const files: Array<{ path: string; hash: string | null }> = [];
  for (const name of names) {
    if (name.startsWith("/") || name.split("/").includes(".."))
      throw new Error("Unsafe checkout path");
    try {
      const stat = await lstat(name);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.size > 16 * 1024 * 1024
      )
        throw new Error("Unsupported checkout artifact");
      files.push({ path: name, hash: digest(await readFile(name)) });
    } catch (error) {
      if (Reflect.get(error as object, "code") !== "ENOENT") throw error;
      files.push({ path: name, hash: null });
    }
  }
  return { hash: digest(JSON.stringify(files)), files };
}
