import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { BSON } from "mongodb";

export const collections = [
  "users",
  "practices",
  "clients",
  "treatments",
  "accounts",
  "sessions",
  "verification_tokens",
] as const;
export type Collection = (typeof collections)[number];
/** Raw frames and typed IDs bind every mapping to the supplied source bytes. */
export interface SourceRow {
  collection: Collection;
  idType: "objectId" | "string";
  id: string;
  hash: string;
  document: Record<string, unknown>;
  ejson: Record<string, unknown>;
}
export interface Source {
  fingerprint: string;
  files: { name: string; hash: string }[];
  rows: SourceRow[];
}

export function digest(bytes: string | Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function typedId(value: unknown): {
  type: SourceRow["idType"];
  id: string;
} {
  if (value instanceof BSON.ObjectId)
    return { type: "objectId", id: value.toHexString() };
  if (typeof value === "string" && value.length)
    return { type: "string", id: value };
  throw new Error("Unsupported source identifier");
}

/** Decode complete BSON frames, retaining canonical EJSON independently of projections. */
export function decodeFrames(
  input: Uint8Array,
  collection: Collection,
): SourceRow[] {
  const bytes = Buffer.from(input);
  const rows: SourceRow[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < bytes.length; ) {
    if (offset + 4 > bytes.length) throw new Error("Truncated BSON frame");
    const length = bytes.readInt32LE(offset);
    if (
      length < 5 ||
      length > 16 * 1024 * 1024 ||
      offset + length > bytes.length
    )
      throw new Error("Invalid BSON frame length");
    const frame = bytes.subarray(offset, offset + length);
    const document = BSON.deserialize(frame);
    const id = typedId(document._id);
    const key = JSON.stringify([id.type, id.id]);
    if (seen.has(key)) throw new Error("Duplicate typed source identity");
    seen.add(key);
    rows.push({
      collection,
      idType: id.type,
      id: id.id,
      hash: digest(frame),
      document,
      ejson: BSON.EJSON.serialize(
        BSON.deserialize(frame, { promoteValues: false }),
        { relaxed: false },
      ),
    });
    offset += length;
  }
  return rows;
}

/** Read a fixed dump graph; reject symlinks, missing collections and unexpected files. */
export async function readSource(root: string): Promise<Source> {
  for (const directory of [root, path.join(root, "myreiki")]) {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error("Unsafe dump directory");
  }
  if (
    JSON.stringify((await readdir(root)).sort()) !==
    JSON.stringify(["myreiki", "prelude.json"])
  )
    throw new Error("Unexpected dump namespaces or root files");
  const expected = collections
    .flatMap((name) => [`${name}.bson`, `${name}.metadata.json`])
    .sort();
  const actual = (await readdir(path.join(root, "myreiki"))).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error("Dump file graph changed");
  const files: Source["files"] = [];
  const rows: SourceRow[] = [];
  for (const relative of [
    "prelude.json",
    ...expected.map((name) => `myreiki/${name}`),
  ]) {
    const file = path.join(root, relative);
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 64 * 1024 * 1024)
      throw new Error("Unsafe dump file");
    const bytes = await readFile(file);
    files.push({ name: relative, hash: digest(bytes) });
    if (relative.endsWith(".bson"))
      rows.push(
        ...decodeFrames(bytes, path.basename(relative, ".bson") as Collection),
      );
    else JSON.parse(bytes.toString("utf8"));
  }
  return { fingerprint: digest(JSON.stringify(files)), files, rows };
}
