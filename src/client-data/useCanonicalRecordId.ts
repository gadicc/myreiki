"use client";
import { useEffect, useState } from "react";
import * as v from "valibot";
import { canonicalId, type RecordKind } from "@/data/model";
import { usePracticeData } from "./Provider";

/** Old bookmarks resolve online without publishing another owner's source mappings. */
export function useCanonicalRecordId(collection: RecordKind, input: unknown) {
  const id = typeof input === "string" ? input : "";
  const owner = usePracticeData().binding?.owner;
  const [resolved, setResolved] = useState<{
    input: string;
    owner: string;
    id: string;
  }>();
  useEffect(() => {
    if (!owner || !id || id === "new" || v.safeParse(canonicalId, id).success)
      return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          `/api/data/legacy?${new URLSearchParams({ owner, collection, id })}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) return;
        const result = await response.json();
        if (
          !controller.signal.aborted &&
          v.safeParse(canonicalId, result.id).success
        )
          setResolved({ input: id, owner, id: result.id });
      } catch {
        /* The current canonical lists remain available offline. */
      }
    })();
    return () => controller.abort();
  }, [collection, id, owner]);
  return resolved?.input === id && resolved.owner === owner ? resolved.id : id;
}
