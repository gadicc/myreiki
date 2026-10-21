import {
  activeClientDataOwner,
  type ClientDataIdentityState,
  createClientDataIdentityState,
  transitionClientDataActivation,
  transitionClientDataSignOut,
} from "@gadicc/loom/client-data";
import Dexie, { type Table } from "dexie";
import type {
  EditableRecord,
  Operation,
  OperationResult,
  Profile,
  RecordKind,
  Records,
  Snapshot,
} from "@/data/model";
import { parseOperation } from "@/data/model";
import type { SpreadsheetRow } from "@/data/spreadsheet";
import { uuidV7 } from "@/lib/uuid";

export interface Identity extends ClientDataIdentityState {
  key: "current";
  signInIntent: string | null;
  verification: number;
}
export interface CachedRecord {
  owner: string;
  kind: RecordKind;
  id: string;
  server: Records[RecordKind] | null;
  local: Records[RecordKind] | null;
}
export interface Pending {
  sequence?: number;
  owner: string;
  operation: Operation;
  state: "ready" | "conflict";
  error?: string;
  lease?: string;
  leaseUntil?: number;
}
export interface IdentityBinding {
  owner: string;
  revision: number;
}

/** A separate database name deliberately leaves retired Gongo clients untouched. */
export class PracticeDatabase extends Dexie {
  identity!: Table<Identity, string>;
  records!: Table<CachedRecord, [string, RecordKind, string]>;
  profiles!: Table<Profile & { serverRevision: number }, string>;
  pending!: Table<Pending, number>;
  imports!: Table<
    { owner: string; practiceId: string; digest: string },
    [string, string, string]
  >;
  constructor(name = "myreiki-offline-v1") {
    super(name);
    this.version(1).stores({
      identity: "key",
      records: "[owner+kind+id],owner,[owner+kind]",
      profiles: "_id",
      pending: "++sequence,owner,&operation.operationId",
      imports: "[owner+practiceId+digest],owner",
    });
  }
  async current(): Promise<Identity> {
    return (
      (await this.identity.get("current")) ?? {
        key: "current",
        signInIntent: null,
        verification: 0,
        ...createClientDataIdentityState(),
      }
    );
  }

  async assertBinding(binding: IdentityBinding) {
    const state = await this.current();
    if (
      activeClientDataOwner(state) !== binding.owner ||
      state.revision !== binding.revision
    )
      throw new Error("Account changed; reopen the record before saving.");
    return state;
  }

  async signOut() {
    return await this.transaction("rw", this.identity, async () => {
      const next = transitionClientDataSignOut(await this.current(), {
        explicit: true,
      }).state;
      await this.identity.put({
        ...next,
        key: "current",
        signInIntent: null,
        verification: (await this.current()).verification,
      });
      return next;
    });
  }

  async beginVerification() {
    return await this.transaction("rw", this.identity, async () => {
      const state = await this.current();
      const next = { ...state, verification: (state.verification ?? 0) + 1 };
      await this.identity.put(next);
      return next;
    });
  }

  async beginSignIn() {
    return await this.transaction("rw", this.identity, async () => {
      const state = await this.current();
      const next = {
        ...state,
        signInIntent: uuidV7(),
        revision: state.revision + 1,
      };
      await this.identity.put(next);
      return next;
    });
  }

  /** A passive check may never undo explicit sign-out or overtake another tab's identity. */
  async receiveSnapshot(
    snapshot: Snapshot | { actor: null },
    baseline: Identity,
  ) {
    return await this.transaction(
      "rw",
      this.identity,
      this.profiles,
      this.records,
      this.pending,
      async () => {
        const state = await this.current();
        if (
          state.revision !== baseline.revision ||
          state.signInIntent !== baseline.signInIntent ||
          state.verification !== baseline.verification
        )
          return false;
        if (!snapshot.actor) {
          await this.identity.put({
            ...transitionClientDataSignOut(state, {
              expectedRevision: baseline.revision,
            }).state,
            key: "current",
            signInIntent: null,
            verification: state.verification,
          });
          return true;
        }
        if (
          state.status === "signed-out" &&
          state.explicitSignOutRevision === state.revision &&
          !state.signInIntent
        )
          return false;
        const transition =
          state.status === "active" &&
          state.lastOwnerId === snapshot.actor._id &&
          !state.signInIntent
            ? { outcome: "applied" as const, state }
            : transitionClientDataActivation(state, snapshot.actor._id, {
                baselineRevision: baseline.revision,
              });
        if (transition.outcome !== "applied") return false;
        const previousProfile = await this.profiles.get(snapshot.actor._id);
        if ((previousProfile?.serverRevision ?? 0) > snapshot.revision) {
          await this.identity.put({
            ...transition.state,
            key: "current",
            signInIntent: null,
            verification: state.verification,
          });
          return true;
        }
        await this.profiles.put({
          ...snapshot.actor,
          serverRevision: snapshot.revision,
        });
        const owner = snapshot.actor._id;
        const pending = await this.pending
          .where("owner")
          .equals(owner)
          .toArray();
        const dirty = new Set(
          pending.map((p) => `${p.operation.collection}:${p.operation.id}`),
        );
        const existing = await this.records
          .where("owner")
          .equals(owner)
          .toArray();
        const remote = new Map<
          string,
          { kind: RecordKind; record: Records[RecordKind] }
        >();
        for (const kind of ["practices", "clients", "treatments"] as const)
          for (const record of snapshot[kind])
            remote.set(`${kind}:${record._id}`, { kind, record });
        for (const cached of existing) {
          const key = `${cached.kind}:${cached.id}`;
          const server = remote.get(key)?.record ?? null;
          if (!server && !dirty.has(key))
            await this.records.delete([owner, cached.kind, cached.id]);
          else
            await this.records.put({
              ...cached,
              server,
              local: dirty.has(key) ? cached.local : null,
            });
          remote.delete(key);
        }
        for (const { kind, record } of remote.values())
          await this.records.put({
            owner,
            kind,
            id: record._id,
            server: record,
            local: null,
          });
        await this.identity.put({
          ...transition.state,
          key: "current",
          signInIntent: null,
          verification: state.verification,
        });
        return true;
      },
    );
  }

  /** Commit the visible edit and its immutable replay command in one IndexedDB transaction. */
  async save<K extends RecordKind>(
    binding: IdentityBinding,
    kind: K,
    input: EditableRecord<K>,
    expectedVersion?: number,
  ) {
    return await this.transaction(
      "rw",
      this.identity,
      this.records,
      this.pending,
      async () => {
        await this.assertBinding(binding);
        const id = input._id || uuidV7();
        const cached = await this.records.get([binding.owner, kind, id]);
        const previous = cached?.local ?? cached?.server;
        if (
          expectedVersion !== undefined &&
          expectedVersion !== (previous?.version ?? 0)
        )
          throw new Error(
            "This record changed while you were editing. Copy your changes and reopen it before saving.",
          );
        if (previous?.deletedAt)
          throw new Error("This record has been deleted.");
        const operation = parseOperation({
          protocol: 1,
          operationId: uuidV7(),
          actorId: binding.owner,
          collection: kind,
          id,
          baseVersion: previous?.version ?? 0,
          kind: "save",
          record: { ...input, _id: id },
        });
        await this.pending.add({
          owner: binding.owner,
          operation,
          state: "ready",
        });
        await this.records.put({
          owner: binding.owner,
          kind,
          id,
          server: cached?.server ?? null,
          local: operation.record!,
        });
        return operation.record as Records[K];
      },
    );
  }

  /** Lease only the oldest command; dependency order is stable across tabs and restarts. */
  async claim(binding: IdentityBinding, now = Date.now()) {
    return await this.transaction(
      "rw",
      this.identity,
      this.pending,
      async () => {
        await this.assertBinding(binding);
        const first = (
          await this.pending
            .where("owner")
            .equals(binding.owner)
            .sortBy("sequence")
        )[0];
        if (!first || first.state !== "ready" || (first.leaseUntil ?? 0) > now)
          return null;
        const claimed = { ...first, lease: uuidV7(), leaseUntil: now + 60_000 };
        await this.pending.put(claimed);
        return claimed;
      },
    );
  }

  async acknowledge(
    binding: IdentityBinding,
    claimed: Pending,
    result: OperationResult,
  ) {
    return await this.transaction(
      "rw",
      this.identity,
      this.pending,
      this.records,
      this.profiles,
      async () => {
        await this.assertBinding(binding);
        const current = await this.pending.get(claimed.sequence!);
        if (!current || !current.lease || current.lease !== claimed.lease)
          return false;
        if (
          result.operationId !== current.operation.operationId ||
          result.collection !== current.operation.collection ||
          result.record._id !== current.operation.id
        )
          throw new Error("Unexpected synchronization receipt");
        await this.pending.delete(current.sequence!);
        const profile = await this.profiles.get(binding.owner);
        if (profile && result.ownerRevision > profile.serverRevision)
          await this.profiles.put({
            ...profile,
            serverRevision: result.ownerRevision,
          });
        const key: [string, RecordKind, string] = [
          binding.owner,
          result.collection,
          result.record._id,
        ];
        const cached = await this.records.get(key);
        const more = (
          await this.pending.where("owner").equals(binding.owner).toArray()
        ).some(
          (p) =>
            p.operation.collection === result.collection &&
            p.operation.id === result.record._id,
        );
        await this.records.put({
          owner: binding.owner,
          kind: result.collection,
          id: result.record._id,
          server:
            cached?.server && cached.server.version > result.record.version
              ? cached.server
              : result.record,
          local: more ? (cached?.local ?? null) : null,
        });
        return true;
      },
    );
  }

  async fail(
    binding: IdentityBinding,
    claimed: Pending,
    error: string,
    conflict: boolean,
  ) {
    await this.transaction("rw", this.identity, this.pending, async () => {
      await this.assertBinding(binding);
      const current = await this.pending.get(claimed.sequence!);
      if (current && current.lease && current.lease === claimed.lease)
        await this.pending.put({
          ...current,
          lease: undefined,
          leaseUntil: undefined,
          state: conflict ? "conflict" : "ready",
          error,
        });
    });
  }

  /** Retry an interrupted transport/configuration failure without rebasing a version conflict. */
  async retryTransport(binding: IdentityBinding) {
    await this.transaction("rw", this.identity, this.pending, async () => {
      await this.assertBinding(binding);
      for (const row of await this.pending
        .where("owner")
        .equals(binding.owner)
        .toArray())
        if (
          row.state === "conflict" &&
          ["ORIGIN_REQUIRED", "FORBIDDEN", "CLIENT_UNAVAILABLE"].includes(
            row.error ?? "",
          )
        )
          await this.pending.put({
            ...row,
            state: "ready",
            lease: undefined,
            leaseUntil: undefined,
          });
    });
  }

  async forget(binding: IdentityBinding) {
    await this.transaction(
      "rw",
      [this.identity, this.records, this.pending, this.profiles, this.imports],
      async () => {
        await this.assertBinding(binding);
        await this.records.where("owner").equals(binding.owner).delete();
        await this.pending.where("owner").equals(binding.owner).delete();
        await this.imports.where("owner").equals(binding.owner).delete();
        await this.profiles.delete(binding.owner);
        await this.signOut();
      },
    );
  }

  /** Capture one owner's records and replay queue at the same durable revision. */
  async exportDevice(binding: IdentityBinding) {
    return await this.transaction(
      "r",
      [this.identity, this.records, this.pending],
      async () => {
        await this.assertBinding(binding);
        return {
          format: "myreiki-device-export-v1",
          owner: binding.owner,
          exportedAt: new Date(),
          rows: await this.records
            .where("owner")
            .equals(binding.owner)
            .toArray(),
          pending: await this.pending
            .where("owner")
            .equals(binding.owner)
            .sortBy("sequence"),
        };
      },
    );
  }

  /** Resolve explicitly against the last freshly fetched server revision. */
  async resolve(
    binding: IdentityBinding,
    sequence: number,
    choice: "local" | "server",
  ) {
    await this.transaction(
      "rw",
      this.identity,
      this.pending,
      this.records,
      async () => {
        await this.assertBinding(binding);
        const pending = await this.pending.get(sequence);
        if (
          !pending ||
          pending.owner !== binding.owner ||
          pending.state !== "conflict"
        )
          throw new Error("Conflict changed");
        const { collection: kind, id } = pending.operation;
        const cached = await this.records.get([binding.owner, kind, id]);
        if (!cached?.server || cached.server.deletedAt || !cached.local)
          throw new Error(
            "This record is unavailable on the server. Export the pending work before removing device data.",
          );
        const matching = (
          await this.pending.where("owner").equals(binding.owner).toArray()
        ).filter(
          (p) => p.operation.collection === kind && p.operation.id === id,
        );
        await this.pending.bulkDelete(matching.map((p) => p.sequence!));
        if (choice === "server")
          await this.records.put({ ...cached, local: null });
        else {
          const operation = parseOperation({
            ...pending.operation,
            operationId: uuidV7(),
            baseVersion: cached.server.version,
            record: cached.local,
          });
          await this.pending.add({
            owner: binding.owner,
            operation,
            state: "ready",
          });
          await this.records.put({ ...cached, local: operation.record! });
        }
      },
    );
  }

  /** One device transaction commits a complete paste plus its replay guard. */
  async importSpreadsheet(
    binding: IdentityBinding,
    practiceId: string,
    rows: SpreadsheetRow[],
    digest: string,
  ) {
    return await this.transaction(
      "rw",
      [this.identity, this.records, this.pending, this.imports],
      async () => {
        await this.assertBinding(binding);
        if (await this.imports.get([binding.owner, practiceId, digest]))
          return { imported: 0, repeated: true };
        const practice = await this.records.get([
          binding.owner,
          "practices",
          practiceId,
        ]);
        if (!practice || (practice.local ?? practice.server)?.deletedAt)
          throw new Error("Choose an available practice.");
        const cached = await this.records
          .where("owner")
          .equals(binding.owner)
          .toArray();
        const clients = cached
          .filter((r) => r.kind === "clients")
          .map((r) => (r.local ?? r.server) as Records["clients"])
          .filter((r) => !r.deletedAt && r.practiceId === practiceId);
        const treatments = cached
          .filter((r) => r.kind === "treatments")
          .map((r) => (r.local ?? r.server) as Records["treatments"])
          .filter((r) => !r.deletedAt && r.practiceId === practiceId);
        let imported = 0;
        for (const row of rows) {
          const candidates = clients.filter(
            (c) =>
              `${c.givenName}${c.familyName ? ` ${c.familyName}` : ""}` ===
              row.clientName,
          );
          if (candidates.length > 1)
            throw new Error(
              "A client name matches multiple records. Import these treatments individually.",
            );
          let client = candidates[0];
          if (!client) {
            const [givenName, ...family] = row.clientName.split(/\s+/);
            client = await this.save(
              binding,
              "clients",
              {
                _id: uuidV7(),
                practiceId,
                givenName,
                familyName: family.join(" "),
                createdAt: new Date(),
              },
              0,
            );
            clients.push(client);
          }
          if (
            treatments.some(
              (t) =>
                t.clientId === client._id &&
                new Date(t.date as Date).getTime() === row.date.getTime() &&
                t.duration === row.duration &&
                t.type === "reiki" &&
                t.reiki.type === row.reikiType &&
                (t.notes ?? "") === row.notes,
            )
          )
            continue;
          const treatment = await this.save(
            binding,
            "treatments",
            {
              _id: uuidV7(),
              practiceId,
              practitionerId: binding.owner,
              clientId: client._id,
              date: row.date,
              duration: row.duration,
              type: "reiki",
              reiki: { type: row.reikiType },
              notes: row.notes,
            },
            0,
          );
          treatments.push(treatment);
          imported++;
        }
        await this.imports.add({ owner: binding.owner, practiceId, digest });
        return { imported, repeated: false };
      },
    );
  }
}

export const practiceDatabase = new PracticeDatabase();
