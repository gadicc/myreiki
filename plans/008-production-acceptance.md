# Production acceptance — 21 October 2026

MyReiki is live at https://www.myreiki.app on the modernized SQL stack. The
operator confirmed production Google sign-in and visibility of their existing
practices, clients and treatments. The initial modernization and Japanese
localization are active.

## Published artifact and verification

- Modernization: [PR #1](https://github.com/gadicc/myreiki/pull/1).
- Canonical domain: [PR #2](https://github.com/gadicc/myreiki/pull/2).
- Live source: `2375e68852276ca06bf949ff8b17eaca732c3740`.
- Live deployment: `dpl_ZHAaJGauLjQahorywvrjK7wqqtep`.
- [Production release](https://github.com/gadicc/myreiki/actions/runs/39623592080)
  passed project-scoped preparation, 81 tests and production checks, standalone
  build, artifact scans, staging, idempotent migrations, readiness, exact
  promotion and public alias/readiness verification.
- Both temporary repository release enablement flags are absent afterward.
  Future approved releases remain gated; the initial credential-smoke mode
  expected the pre-import 503 fence and is not a post-cutover readiness check.
- Public anonymous auth and readiness pass without a protection bypass. English
  and Japanese browser switching passes without page errors. The apex and old
  `myreiki.vercel.app` hostname return HTTP 308 to the canonical domain while
  preserving paths and query strings.
- Google initiation reaches the provider with the canonical callback; the
  operator separately completed the full existing-account sign-in.

## Data and legacy retirement

The rehearsed saved plan imported 3 users, 3 practices, 11 clients, 193 treatments
and 3 provider accounts. Legacy sessions and verification records were archived
without retaining authentication authority. Typed comparisons, owner isolation,
legacy treatment links, rendered Byosen points and language switching with
unchanged notes passed. Test sessions were removed and exact replay passed
before activation. Production and synthetic development/Preview use independent
Neon roots with verified credential isolation.

The dedicated Mongo principal was first restricted to its sole read role. The
importer verified effective privileges and denied an impossible-ID non-upserting
update, drained in-flight work and matched a fresh primary snapshot with every
reviewed backup document. Production SQL import and a final pre-cutover replay
passed before the release.

After accepting production, the operator deleted the dedicated `myreiki` Atlas
user. A fresh connection using the saved credential failed authentication;
code 8000/AtlasError was accepted only with the expected authentication-denial
meaning. Production `MONGO_URL`, `MONGODB_RELAY_PASSWORD` and `NEXTAUTH_SECRET`
records were removed by exact identity after confirming each was Production-only.
Other environment configuration was preserved and public readiness still passes.
Immutable deployments retain captured environment values, but the old Mongo
credential is revoked. No database or backup was deleted.

Protected source archives, import allocations, provider/verification receipts
and recovery material remain owner-only under ignored `.private/`; the supplied
backup remains outside the repository. No private records or credential values
are included in this report.

## Ongoing recovery and optional follow-ups

Production can now accept new SQL and offline work. Recover to a compatible SQL
application. Returning code to Mongo or restoring the old dump alone would lose
acknowledged work; any reverse transfer needs a pause and explicit reconciliation.
Do not run the pristine bootstrap comparison against new legitimate records or
sessions. Preserve import receipts and source mappings.

Bun remains the developer/CI tool; Node 24 remains the production runtime.
Potential Bun runtime trials, narrower SQL roles, production Google credential
rotation with password-wallet custody, and the reviewed
[OIDC Trusted Sources rollout](006-oidc-trusted-sources.md) are follow-ups.
Loom already supplies trust planning/apply/check primitives; adopting OIDC here
remains deliberate and separate from Vercel deployment and Neon credentials.
