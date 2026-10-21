import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { verifyArtifactPolicy } from "../scripts/artifact-policy.mjs";

it("rejects copied dotenv secrets and mapped private files while traversing contained build symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "myreiki-artifact-"));
  try {
    await mkdir(join(root, "functions/app.func"), { recursive: true });
    await writeFile(
      join(root, "functions/app.func/index.js"),
      "export default {};",
    );
    await symlink("index.js", join(root, "functions/app.func/contained.js"));
    expect(await verifyArtifactPolicy(root)).toEqual({
      privateEnvironmentFiles: 0,
    });
    await writeFile(
      join(root, "functions/app.func/.env.local"),
      "SYNTHETIC_SECRET=example",
    );
    await expect(verifyArtifactPolicy(root)).rejects.toThrow(".env.local");
    await rm(join(root, "functions/app.func/.env.local"));
    await symlink("index.js", join(root, "functions/app.func/.env.local"));
    await expect(verifyArtifactPolicy(root)).rejects.toThrow(".env.local");
    await rm(join(root, "functions/app.func/.env.local"));
    await writeFile(
      join(root, "functions/app.func/.vc-config.json"),
      JSON.stringify({
        filePathMap: { "renamed.txt": "../../.env.production.local" },
      }),
    );
    await expect(verifyArtifactPolicy(root)).rejects.toThrow("filePathMap");
  } finally {
    await rm(root, { recursive: true });
  }
});
