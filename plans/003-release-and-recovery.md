# Production release and recovery

## Prepared boundary

The approved Vercel team is `wastelands-jp`, project `myreiki`; functions and Neon
are colocated in Singapore. `vercel.json` disables automatic `main` deployments.
The app-owned GitHub workflow uses a frozen Bun install, Node 24, project-scoped
Vercel preparation, metadata-backed placeholders, artifact scanning, staging
with `--skip-domain`, migration validation, migrations, staged readiness, exact
promotion and public alias/readiness verification. Actions are pinned by SHA.

The workflow requires `MYREIKI_PRODUCTION_RELEASE_ENABLED=true` and is currently
**disabled**. A separately gated `credential-smoke` dispatch may stage and check
the migration fence without migrations or promotion; both enablement variables
remain unset. Loom configured a main-only GitHub `Production` environment and a
project-scoped Vercel credential expiring 19 January 2027; its project access and
denial of team-level access were verified. The direct migration secret and role
metadata are installed there too. The merged workflow passed credential-smoke
run `39600941271`; it staged production without migrations or promotion. Both enablement flags remain unset.

Separate Production/Preview auth signing keys, the Production origin and import
fingerprint are configured in Vercel. Recovery keys are owner-only under
`.private/auth-signing-key-recovery.json`; store the needed copies in the password
wallet. Existing Google credentials are retained. Preview now derives its own
callback origin; actual Preview Google callback registration is still separate
from database isolation.

The operator approved the MyReiki-only persistent automation-bypass credential.
It is installed as `VERCEL_AUTOMATION_BYPASS_SECRET` in the main-only GitHub
`Production` environment. The value was transferred over stdin and retained in
an owner-only recovery file; it was not printed. A HEAD request to a static icon
on the existing protected deployment returned 302 anonymously and 200 with the
credential. The public deployment was unchanged. This verifies the protection
gate. The actual GitHub credential-smoke and subsequent staged runtime
acceptance also passed; these do not establish production Google sign-in.

A read-only Loom OIDC Trusted Sources proposal is prepared but unapplied.
See [OIDC follow-up](006-oidc-trusted-sources.md). Keep the current credential
path until an OIDC replacement passes its own runtime checks. Do not silently
fall back to public staging or broaden the Vercel deployment token.

Production auth and domain routes independently require
`MYREIKI_IMPORT_PLAN_SHA256` to match a completed SQL `legacy_import` receipt.
Staging an artifact against an empty target cannot create new application
accounts or records. Preview remains bound to the independent synthetic root.

## Before the first cutover

1. Freeze and review the source/lockfile, saved import plan, source hashes,
   catalog and exact provider target. Keep protected backups and receipts. The
   rehearsal importer refuses Production endpoints. `scripts/production-import.ts`
   prepares a target-bound proposal and requires its exact SHA-256 plus frozen
   inputs before applying. Its explicit resume mode requires the existing matching
   database checkpoint and reconstructs source hashes from the saved plan.
2. Verify database/branch identity and transport with the actual release command.
   The first bootstrap uses the integration's `neondb_owner` role on the dedicated
   Production branch; narrower runtime/migration roles remain a separate
   hardening follow-up. The migration URL is separately governed in GitHub.
   Runtime and app-owned migrations verify TLS and required SCRAM PLUS. Loom's
   generic credential preflight uses postgres-js and is an identity/privilege
   check, not proof of channel binding; the app's pg migrator supplies that proof.
3. Verify the configured signing key, public origin, import fingerprint and
   protected release credentials. Preserve the currently deployed Google secret
   until deliberate rotation; the operator can store its replacement in the
   password wallet. The local dev key is not the Production OAuth key. Confirm
   the Production Google callback URL.
4. Exercise the actual project-token preparation/build/stage path with those
   bindings, protected readiness and artifact identity. Do this before a writer
   pause. Keep the release switch disabled until the cutover is approved.
5. Establish a verified legacy writer fence covering the current deployment,
   historical immutable deployment URLs, auth callbacks, relay and any jobs or
   direct clients. Changing the main alias alone is insufficient. Drain in-flight
   work and take a final consistent source snapshot or prove the approved dump
   still equals the fenced authority. A dump without oplog capture does not prove
   consistency. The operator supplied a protected live Mongo credential. A primary snapshot
   transaction matched every raw BSON document in the backup. The account is
   dedicated to MyReiki. The operator restricted it to the sole
   `readAnyDatabase@admin` role; the importer verified its effective read-only
   privileges and denied update before completing the Production import. The
   verifier checks effective privileges, an authorization denial for an impossible-ID non-upserting update, and a new consistent read
   after a drain interval.
6. Rebuild the reviewed plan if source changed; retain stable allocations and
   exact dispositions. Rehearse it, import the approved Production target, compare
   typed rows and references, and run protected runtime acceptance for existing
   Google identities/grants and records before promotion. Keep all unrelated
   external writes disabled during rehearsal.
7. Review the concrete staged artifact, target, results and recovery action with
   the operator, then promote and verify the public deployment before reopening
   writes. Preserve the legacy writer fence afterwards.

## Recovery

Before SQL accepts new writes, traffic can return to the unchanged legacy
application while writers remain fenced. After SQL accepts writes, recover to a
compatible app on SQL. Reverting code to Mongo or restoring the old dump alone
would lose acknowledged SQL work. Any reverse transfer must first pause writes
and rehearse reconciliation from domain records and operation receipts.

Keep source archives, aliases, saved plans and receipts until recovery has been
accepted. Old Gongo pending work is explicitly outside scope. New offline work
must remain recoverable for the same account through sign-out, failed transport,
expired queue leases, reloads and conflicts. Device exports are private and
contain client notes; browsers can still erase local storage.

## Evidence still separate from release readiness

Local Google success, synthetic browser tests, live synthetic SQL races and a
protected exact import replay each prove their own boundary. Production import,
the legacy writer fence and staged deployed runtime acceptance are now verified. The GitHub credential-smoke passed; the full promotion path
and production Google sign-in remain pending. The primary domain update and
its release boundary are recorded in [the domain plan](007-production-domain.md).

Local Vercel prebuilds must use an isolated copy of nonignored source. The
installed Vercel builder explicitly copies root dotenv files, independently of
Next's tracing exclusions. A local working-tree build was rejected before upload
when exact-value scanning found copies of `.env.local`; the generated output was
removed. CI starts from a clean checkout. Both paths must run the app's artifact
policy after Loom's placeholder scan; it rejects private dotenv files, private
directories and corresponding file-path mappings.
