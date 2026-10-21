"use client";
import { useEffect, useState } from "react";

/** Keep an open form and its original revision stable while background sync runs. */
export function useRecordDraft<T extends { _id: string; version: number }>(
  record: T | undefined,
) {
  const [draft, setDraft] = useState<T>();
  useEffect(() => {
    if (record && draft?._id !== record._id) setDraft(record);
  }, [record, draft?._id]);
  return { draft, acceptSaved: setDraft };
}
