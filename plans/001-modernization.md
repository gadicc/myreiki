# MyReiki modernization

## Current state — 21 October 2026

The implementation in the working tree uses SQL and Dexie. The existing public
application still uses Mongo. Implementation checkpoint `1050ab6` is saved locally on
`codex/modernize-myreiki`. No push, deployment or Production SQL import has been
performed as part of this modernization.

| Boundary | Evidence / state |
| --- | --- |
| Initial checkout | `main`, clean at `e47268e` |
| Product | Operator chose MyReiki, initially targeting Jikiden Reiki; generic modality retained |
| Tooling | Bun 1.4.3 with isolated text lock; Node 24 server runtime |
| Vercel | Project `prj_4lUymF9XOiQJx1H6etvUmQ3Bk0Lg`, `gadicc/myreiki`, production branch `main` |
| Ownership | Operator-approved transfer completed; provider verified `wastelands-jp`, `team_csZisOffvMIGjgEuwRLc2eAX` |
| Placement | Operator-approved and provider verified: functions `sin1`, Neon `aws-ap-southeast-1`; project Node 24.x |
| Existing live deployment | Historical legacy artifact remains live; project settings do not redeploy it |
| Neon resource | Loom provisioned `myreiki-db`, `store_G5fwJ3kvJPMIBQEP`, project `spring-silence-76514204`; existing integration plan retained |
| Production root | `br-orange-waterfall-az9wxp6q`; not imported or activated |
| Synthetic development/Preview | Independent schema-only root `br-twilight-feather-azxw20dn`; no production backup copied |
| Private rehearsal | Independent protected root `br-wandering-surf-azkwzqwg`; supplied Mongo backup imported and exactly compared |
| Google | Actual local Google round trip confirmed by the operator; synthetic OAuth tests separately cover imported provider identity |

Singapore is the approved initial compromise for UK and Japan, with compute and
database colocated. Teacher geography is not a measurement of future customers
or network latency; reassess with actual usage. Bun is used for development and
CI tooling; a Bun production runtime experiment is deferred while persistence
and authentication change.

## Implemented product boundaries

- Better Auth uses Drizzle/PostgreSQL, with an environment-free factory and
  fresh server authorization. Existing Google provider/subject links and grants
  are retained; equal email addresses are not an account-merging key. Old
  sessions and verification tokens are retired. One-time sign-in is accepted.
- Practice, client and treatment services enforce owner/parent relationships,
  canonical UUIDv7 IDs, compare-and-swap versions, tombstones and transactional
  operation receipts. Admin directory access stays online and freshly checked.
- Dexie stores owner-partitioned records, immutable ordered commands and import
  receipts. Loom supplies storage-neutral identity transitions and sign-out
  fencing; the app owns its schema, queue and domain synchronization policy.
- No app-imposed offline expiry. Sign-out immediately locks cached access while
  preserving pending work for that same account. Online replay checks current
  identity and permissions. Account removal is explicit and supports export.
  Remote revocation cannot be learned while disconnected, and browser storage
  is not guaranteed durable. The operator accepted these tradeoffs.
- Valibot replaces Zod; React Hook Form remains. Forms retain draft revisions,
  report failed saves and await durable device commits. Spreadsheet pastes are
  validated and saved atomically with repeat detection. Cloning rebinds treatment
  and body-point IDs. The body-point editor follows asynchronously loaded values.
- PWA assets support offline reloads. API traffic is network-only and private;
  activation purges older API cache entries. Test-login pages are excluded from
  prerendered precache input by request-time guards.
- Gongo runtime, relay and experimental uploads return 410. Gravatar email-hash
  requests were removed. Old Gongo queues need no recovery per the operator.

## Backup and import evidence

The supplied `/home/dragon/backups/myreiki/2026-10-21` dump contains 3 users,
3 practices, 11 clients, 193 treatments, 3 accounts, 16 sessions and 1 verification
token. It was restored into a disposable loopback Mongo instance; counts,
indexes, full collection validation and unchanged source hashes were verified.
The dump was taken without oplog capture; it is not a coordinated final snapshot.

The planner validates a closed BSON/metadata file graph, typed IDs, references,
provider identities, dates, modalities, durations and body coordinates. Saved
UUID allocations and raw typed archives are owner-only under `.private/`, never
repository fixtures. The source contains three body points; all parent links
match their treatment. No files collection or domain attachment references were
found. No independent S3-object backup was required by the observed app graph.

The protected rehearsal applied the saved plan atomically. Repeated execution
compares PostgreSQL typed values in both directions with multiplicity across
seven imported tables and four required-empty tables. It refuses a changed plan,
source or newer application writes. The latest replay passed with no old auth
sessions. Development and Preview cannot inherit this private rehearsal data.

## Verification and remaining gates

Tests cover schemas, actual form controls, date clearing, SQL constraints,
provider-linked OAuth identity, ownership, revocation, receipts, conflicts,
Dexie transactions, account fencing, imports and retired protocols. Browser
checks use synthetic accounts on a production-mode local server; the real
Google sign-in check is separate. See the compatibility ledger for final results.

The remaining external boundary is [the reviewed production cutover](003-release-and-recovery.md):
final legacy-writer fencing and snapshot consistency, production signing and
release credential smoke, strict transport, protected
runtime acceptance and promotion. No rollback to Mongo is safe after new SQL
writes without reconciling those writes.

The operator supplied live Production Mongo access and confirmed its account is
dedicated to MyReiki. A read-only primary snapshot matched the backup byte for
byte across all seven collections. The final writer fence remains pending.

Independent Neon roots initially inherited their parent's role password. The
synthetic and rehearsal passwords have now been rotated independently; cross-branch
authentication denial is verified separately from data ancestry. Production's
password was preserved. Local and Preview credentials track the synthetic root.

Existing legacy record bookmarks resolve online through owner-checked source
aliases. Canonical lists and records remain the offline entry point. The
protected runtime check covers an actual legacy treatment URL as well as loaded
body points and all three existing owners.
