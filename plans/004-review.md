# Integrated modernization review

21 October 2026. Applied `loom-torvalds-review` with its web-application profile
and CLI/tooling profile for maintenance commands. The optional upstream review
skill is not installed. This was an explicit local adversarial pass; no parallel
reviewer or independent security audit is claimed.

## Contracts traced

- Imported provider/subject bindings, new account defaults, grant inputs, fresh
  session reads and revocation around asynchronous SQL work.
- Owner/parent checks, immutable ownership, versions, tombstones and operation
  receipts inside the same locked transaction.
- Account changes during callbacks, device transactions and fetches; explicit
  sign-out, stale verification responses, queue leases, conflicts, cold reload,
  atomic import, private export and explicit device removal.
- PWA install/update behavior, old API cache cleanup, private response headers,
  test-login guards and anonymous identity responses.
- Typed source identities and archives, saved UUID allocations, source graph and
  plan digests, SQL constraints, atomic rollback, repeated imports, schema/target
  checks, writer fences and post-write recovery.
- Release branch restriction, token scope, preserved migration environment,
  placeholder scan, staged artifact identity, smoke-before-promotion and live
  alias/readiness rechecks.

## Findings corrected during integration

1. Disabled test-login HTML was included in precache input, aborting worker
   installation. The route now evaluates per request and is excluded from the
   prerender manifest. Production browser installation and API-cache exclusion pass.
2. The body-point editor retained only its initial value, hiding asynchronously
   loaded points. It now follows the controlled value; clone IDs/parents are
   rebound. Fractional controls, invalid point IDs and out-of-range movement
   are rejected or prevented.
3. Loopback request normalization caused legitimate POSTs to fail origin checks.
   Checks now bind public Host and protocol to Origin; cross-port and cross-site
   requests remain rejected.
4. Late snapshots could overtake acknowledgements or unlock an explicit local
   sign-out. Durable identity revisions, verification ordering, owner revisions
   and the explicit lock floor fence those transitions.
5. A plain practice link reloaded the document during replay, abandoning its
   lease. Framework navigation preserves the provider; expired leases are still
   recoverable without forcing duplicate operations.
6. Offline server sign-out failure escaped after successful device locking. The
   device remains locked, pending work is retained and the transport failure is
   reported without reopening records.
7. Device export read records and pending work separately. It now captures both
   atomically, rechecks account binding before downloading and handles storage
   errors without an unhandled rejection.
8. Independent Neon roots inherited credentials. Nonproduction role passwords
   were rotated separately, and credential isolation is tested independently of
   branch ancestry and row isolation.
9. The generic migration path did not establish required channel binding. The
   app-owned migration command uses its verified pg connection and keeps Loom's
   authoritative environment loading and release credential checks.
10. Saved legacy aliases were not reachable from bookmarks. An online resolver
    now verifies current ownership and the completed import before resolving.
    Ambiguous or deleted mappings fail closed; stale owner callbacks are aborted.

11. Vercel's builder copied local dotenv files into standalone functions despite
    a successful placeholder scan. Exact-value scanning caught this before upload.
    The rejected output was removed. Isolated local prebuilds and an additional
    artifact policy prevent private environment files and mappings from shipping.

## Gated external acceptance

The local checks and protected runtime evidence support review of this
implementation. They do not establish a completed production cutover. The legacy
writer fence, exact approved Production import, full protected staging/release
credential path, real Production Google flow and public deployment acceptance
remain explicit gates. The current live application still uses Mongo, and the
Production SQL branch is not activated.

A metadata-search mistake printed unrelated Shadowlang bypass credentials.
The operator explicitly approved remediation. Both exposed entries were revoked
and its environment token regenerated; private receipts record verification.
No credentials or patient documents belong in this review or repository.
