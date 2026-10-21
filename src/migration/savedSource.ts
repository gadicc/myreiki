import { BSON } from "mongodb";
import type { ImportPlan } from "./plan";
import { collections, type Source, typedId } from "./source";

/** A fingerprint-verified saved plan retains every source hash needed for source-free retry. */
export function sourceFromSavedPlan(plan: ImportPlan): Source {
  if (plan.version !== 1) throw new Error("Unsupported saved import version");
  return {
    fingerprint: plan.source,
    files: structuredClone(plan.files),
    rows: plan.archives.map((archive) => {
      const collection = collections.find(
        (name) => name === archive.collection,
      );
      if (
        archive.source !== plan.source ||
        !collection ||
        !/^[a-f\d]{64}$/.test(archive.sourceHash)
      )
        throw new Error("Invalid saved source archive");
      const document = BSON.EJSON.deserialize(
        archive.ejson as Record<string, unknown>,
        { relaxed: false },
      ) as Record<string, unknown>;
      const id = typedId(document._id);
      if (id.type !== archive.bsonType || id.id !== archive.legacyId)
        throw new Error("Saved archive identity differs");
      return {
        collection,
        idType: id.type,
        id: id.id,
        hash: archive.sourceHash,
        document,
        ejson: archive.ejson as Record<string, unknown>,
      };
    }),
  };
}
