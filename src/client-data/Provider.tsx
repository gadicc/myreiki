"use client";
import { activeClientDataOwner } from "@gadicc/loom/client-data";
import { useLingui } from "@lingui/react";
import { Plural, Trans } from "@lingui/react/macro";
import { Alert, Button, Stack } from "@mui/material";
import { useLiveQuery } from "dexie-react-hooks";
import React from "react";
import superjson from "superjson";
import type {
  EditableRecord,
  Profile,
  RecordKind,
  Records,
  Snapshot,
} from "@/data/model";
import { authClient, useAuthSession } from "@/lib/auth-client";
import { displayError } from "@/lib/i18n/messages";
import {
  practiceDatabase as database,
  type IdentityBinding,
  type Pending,
} from "./database";

interface DataContext {
  profile: Profile | null;
  binding: IdentityBinding | null;
  practices: Records["practices"][];
  clients: Records["clients"][];
  treatments: Records["treatments"][];
  pending: Pending[];
  save: <K extends RecordKind>(
    kind: K,
    record: EditableRecord<K>,
    expectedVersion?: number,
  ) => Promise<Records[K]>;
  sync: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: () => Promise<void>;
}
const Context = React.createContext<DataContext | null>(null);
const lockKey = "myreiki:explicit-lock";
let generation = 0;

/** Browser data is activated by verified server identity; auth hook data is only a mismatch hint. */
export function PracticeDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { i18n } = useLingui();
  const [error, setError] = React.useState("");
  const [fence, setFence] = React.useState(0);
  const [hidden, setHidden] = React.useState(false);
  const running = React.useRef(false);
  const suspended = React.useRef(false);
  const session = useAuthSession();
  const view = useLiveQuery(async () => {
    try {
      return await database.transaction(
        "r",
        database.identity,
        database.records,
        database.profiles,
        database.pending,
        async () => {
          const identity = await database.current();
          const owner = activeClientDataOwner(identity);
          return {
            identity,
            profile: owner ? await database.profiles.get(owner) : undefined,
            records: owner
              ? await database.records.where("owner").equals(owner).toArray()
              : [],
            pending: owner
              ? await database.pending
                  .where("owner")
                  .equals(owner)
                  .sortBy("sequence")
              : [],
          };
        },
      );
    } catch {
      setError(
        "Device storage is unavailable. Enable browser storage to open or edit records.",
      );
      return undefined;
    }
  }, []);
  const owner = view && activeClientDataOwner(view.identity);
  const permitted = Boolean(
    owner &&
      !hidden &&
      (fence === 0 ||
        (view!.identity.explicitSignOutRevision >= fence &&
          view!.identity.revision > view!.identity.explicitSignOutRevision)),
  );
  const binding = permitted
    ? { owner: owner!, revision: view!.identity.revision }
    : null;

  React.useEffect(() => {
    const readFence = () => {
      try {
        const value = Number(localStorage.getItem(lockKey));
        if (Number.isSafeInteger(value) && value > 0)
          setFence((previous) => Math.max(previous, value));
      } catch {
        /* Durable IndexedDB identity remains the authority. */
      }
    };
    readFence();
    const onStorage = (event: StorageEvent) => {
      if (event.key === lockKey) readFence();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const sync = React.useCallback(async () => {
    if (running.current || suspended.current) return;
    running.current = true;
    const started = generation;
    try {
      const baseline = await database.beginVerification();
      try {
        const localFence = Number(localStorage.getItem(lockKey));
        if (
          localFence > baseline.explicitSignOutRevision &&
          !baseline.signInIntent
        )
          return;
      } catch {
        /* IndexedDB remains authoritative when localStorage is unavailable. */
      }
      if (
        baseline.status === "signed-out" &&
        baseline.explicitSignOutRevision === baseline.revision &&
        !baseline.signInIntent
      )
        return;
      const response = await fetch("/api/data", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok)
        throw new Error(
          "Could not verify the account. Saved device records remain available offline.",
        );
      const snapshot = superjson.parse<Snapshot | { actor: null }>(
        await response.text(),
      );
      if (started !== generation) return;
      const applied = await database.receiveSnapshot(snapshot, baseline);
      if (!applied) return;
      if (!snapshot.actor) {
        setHidden(true);
        return;
      }
      setHidden(false);
      try {
        localStorage.removeItem(lockKey);
      } catch {
        /* Identity is already durable. */
      }
      const identity = await database.current();
      const active = activeClientDataOwner(identity);
      if (!active) return;
      const current = { owner: active, revision: identity.revision };
      setError("");
      // The server freshly authorizes every command; the local lease prevents
      // competing tabs from replaying the dependency queue out of order.
      for (let i = 0; i < 100 && started === generation; i++) {
        const claimed = await database.claim(current);
        if (!claimed) break;
        try {
          const result = await fetch("/api/data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: superjson.stringify(claimed.operation),
          });
          if (started !== generation) return;
          const body = superjson.parse(await result.text());
          if (!result.ok) {
            const code = (body as { error?: string }).error || "SYNC_FAILED";
            await database.fail(current, claimed, code, result.status === 409);
            if (result.status === 401) setHidden(true);
            throw new Error(
              code === "VERSION_CONFLICT"
                ? "This record changed on another device. Choose which version to keep below."
                : "Synchronization paused. Your pending work remains on this device.",
            );
          }
          await database.acknowledge(
            current,
            claimed,
            body as Parameters<typeof database.acknowledge>[2],
          );
        } catch (cause) {
          if (started === generation)
            await database
              .fail(current, claimed, "SYNC_INTERRUPTED", false)
              .catch(() => undefined);
          throw cause;
        }
      }
    } catch (cause) {
      if (started === generation)
        setError(
          cause instanceof Error
            ? cause.message
            : "Synchronization paused; pending work is retained.",
        );
    } finally {
      running.current = false;
    }
  }, []);

  React.useEffect(() => {
    void sync();
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    const timer = setInterval(sync, 60_000);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
      clearInterval(timer);
    };
  }, [sync]);

  React.useEffect(() => {
    if (session.data?.user.id && owner && session.data.user.id !== owner) {
      setHidden(true);
      void sync();
    }
  }, [session.data?.user.id, owner, sync]);

  const lock = React.useCallback(async () => {
    suspended.current = true;
    generation++;
    setHidden(true);
    const state = await database.current();
    const nextFence = state.revision + 1;
    setFence((previous) => Math.max(previous, nextFence));
    try {
      localStorage.setItem(lockKey, String(nextFence));
    } catch {
      /* The durable transaction still fences every other tab. */
    }
    await database.signOut();
  }, []);
  const signOut = React.useCallback(async () => {
    await lock();
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Server sign-out was unavailable");
    } catch {
      // Local sign-out has already committed. Losing the network must neither
      // reopen records nor turn this successful device lock into an exception.
      setError("Signed out on this device. Connect before signing in again.");
    }
  }, [lock]);
  const signIn = React.useCallback(async () => {
    await lock();
    // Invalidate an older account cookie before persisting intent to activate
    // a fresh OAuth answer, including when a prior offline sign-out could not.
    const result = await authClient.signOut();
    if (result.error)
      throw new Error("Connect to the internet before signing in.");
    await database.beginSignIn();
    const login = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/treatments",
    });
    if (login.error) {
      await lock();
      throw new Error(login.error.message || "Google sign-in failed");
    }
  }, [lock]);

  const visible =
    view?.records
      .map((row) => ({ kind: row.kind, record: row.local ?? row.server }))
      .filter((row) => row.record && !row.record.deletedAt) ?? [];
  const practices = permitted
    ? visible
        .filter((row) => row.kind === "practices")
        .map((row) => row.record as Records["practices"])
    : [];
  const practiceIds = new Set(practices.map((row) => row._id));
  const clients = permitted
    ? visible
        .filter(
          (row) =>
            row.kind === "clients" &&
            practiceIds.has((row.record as Records["clients"]).practiceId),
        )
        .map((row) => row.record as Records["clients"])
    : [];
  const clientIds = new Set(clients.map((row) => row._id));
  const treatments = permitted
    ? visible
        .filter(
          (row) =>
            row.kind === "treatments" &&
            practiceIds.has((row.record as Records["treatments"]).practiceId) &&
            clientIds.has((row.record as Records["treatments"]).clientId),
        )
        .map((row) => row.record as Records["treatments"])
    : [];
  const save: DataContext["save"] = async (kind, record, expectedVersion) => {
    if (!binding) throw new Error("Sign in before editing records.");
    const saved = await database.save(binding, kind, record, expectedVersion);
    void sync();
    return saved;
  };
  const context = {
    profile: permitted ? (view?.profile ?? null) : null,
    binding,
    practices,
    clients,
    treatments,
    pending: permitted ? (view?.pending ?? []) : [],
    save,
    sync,
    signOut,
    signIn,
  };

  return (
    <Context.Provider value={context}>
      {error && (
        <Alert
          severity="warning"
          action={
            <Button
              onClick={async () => {
                if (binding) await database.retryTransport(binding);
                await sync();
              }}
            >
              <Trans>Retry</Trans>
            </Button>
          }
        >
          {displayError(i18n, error)}
        </Alert>
      )}
      {context.pending.length > 0 && (
        <Alert severity="info">
          <Plural
            value={context.pending.length}
            one="# change saved on this device, waiting to sync."
            other="# changes saved on this device, waiting to sync."
          />
        </Alert>
      )}
      {context.pending
        .filter((p) => p.state === "conflict")
        .slice(0, 1)
        .map((p) => (
          <Alert key={p.sequence} severity="warning">
            {displayError(
              i18n,
              p.error === "VERSION_CONFLICT"
                ? "This record changed on another device. Choose which version to keep."
                : "A saved change could not be synchronized. Your work remains on this device.",
            )}
            <Stack direction="row" spacing={1}>
              {p.error !== "VERSION_CONFLICT" && (
                <>
                  <Button
                    onClick={async () => {
                      if (binding) await database.retryTransport(binding);
                      await sync();
                    }}
                  >
                    <Trans>Retry synchronization</Trans>
                  </Button>
                  <Button href="/account">
                    <Trans>Export pending work</Trans>
                  </Button>
                </>
              )}
              {p.error === "VERSION_CONFLICT" &&
                (["local", "server"] as const).map((choice) => (
                  <Button
                    key={choice}
                    onClick={async () => {
                      try {
                        await sync();
                        const identity = await database.current();
                        const active = activeClientDataOwner(identity);
                        if (!active) throw new Error("Sign in again");
                        await database.resolve(
                          { owner: active, revision: identity.revision },
                          p.sequence!,
                          choice,
                        );
                        await sync();
                      } catch (cause) {
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : "Could not resolve conflict",
                        );
                      }
                    }}
                  >
                    {displayError(
                      i18n,
                      choice === "local"
                        ? "Keep my changes"
                        : "Use server version",
                    )}
                  </Button>
                ))}
            </Stack>
          </Alert>
        ))}
      <React.Fragment key={context.profile?._id ?? "locked"}>
        {children}
      </React.Fragment>
    </Context.Provider>
  );
}

export function usePracticeData() {
  const data = React.useContext(Context);
  if (!data) throw new Error("PracticeDataProvider is required");
  return data;
}
