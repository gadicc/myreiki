# Modernization compatibility ledger

## Current dependency decisions

| Unit | Original | Selected |
| --- | --- | --- |
| Tasks/dependencies | Yarn, no manager pin | Bun 1.4.3, native isolated text lock |
| Server | Node 20 project setting | Node 24.x, provider verified; historical live deployment unchanged |
| Loom | 1.15.2, no manifest | Published 2.1.1; manifest-owned auth, DB, PWA and OIDC release checks |
| Framework | Next 15.0.7, React 18.2 | Next 16.4.2, React/DOM 19.3.1 |
| UI | MUI 7, date pickers 8 | MUI 9.5.0, date pickers 9.16.0 |
| Forms | Zod 3, old resolver/RHF | Valibot 1.5.0, resolver 6, RHF 7.90 |
| Auth | Better Auth 1.4.19/Mongo | Better Auth 1.7.12/Drizzle, Google identity preservation |
| Client data | Gongo | Dexie 4.4.6, app outbox, Loom identity fences |
| SQL | None | Drizzle 0.45, pg 8.23.1, Neon Singapore, UUIDv7 |
| Verification | ESLint/Prettier, no tests | Biome 2.5.15, TS 5.9.3, Vitest 5.0.5, Playwright 1.64.1 |
| PWA | Serwist 9.5.7 | 9.5.13; private API traffic excluded |
| Native images | Sharp 0.32.6 | 0.34.5 |
| Deployment CLI | Global only | Pinned Vercel 60.0.1 development dependency |

MongoDB 6.5.0 remains development-only for source tools. Gongo and relay packages,
AWS SDK v2, file-type, music-metadata and browser hashing dependencies were
removed when their runtime paths were retired. TypeScript 7 and the Vercel Bun
runtime are deferred to isolate the persistence migration from further runtime
changes. Node types stay on the 24 line.

## Verified scope

- The original TypeScript baseline passed; no original automated suite existed.
- Framework, forms, auth, SQL and Dexie units have passing local tests/types.
  Final commands are `bun run check`, `bun run build`, `bun run loom skills check`
  and `bun run loom check --production`. Browser acceptance is a separate
  `bun run test:browser` against a production build and synthetic database.
- Actual Google sign-in on localhost:3006 was confirmed by the operator.
- Protected source restore, SQL import and exact unchanged replay passed. The
  Production branch has not been imported. Private receipts remain ignored.
- The app-owned release workflow now passes Loom's static production wiring
  check, but is deliberately disabled. This is not a deployed credential smoke
  or production runtime acceptance result.

## Compatibility findings resolved

1. Bun's direct changed-Yarn import was unreliable; the unchanged baseline was
   converted first, followed by a native Bun 1.4.3 lock with supported config
   version. Only Bun's lock remains authoritative.
2. Gongo's BSON class and mutation-label mismatches were characterized during
   the bridge stage. The bridge and its runtime dependencies are now retired;
   the active server uses explicit SQL authorization instead.
3. PGlite strips a leading BOM in returned text. Tests compare stored UTF-8 bytes
   inside PostgreSQL and ordinary Unicode separately. No source text was
   normalized. A live pg round-trip check is recorded separately.
4. Framework migration required current MUI slots/system props, SVG/Turbopack
   rules and App Router integration. Production builds generate the PWA worker
   after the framework artifact.
5. Next normalizes loopback request URLs. Same-origin POST checks compare the
   browser Origin against the public Host and protocol, with cross-origin and
   cross-port regression checks.
6. Precaching the disabled `/dev-login` prerender caused service-worker install
   failure. Request-time evaluation removes it from precache input and retains
   the production 404. Browser checks cover successful install and API exclusion.
7. The body-point editor previously copied only its first props into local
   state, hiding points loaded later. It now uses the controlled form value and
   rebinds clone IDs; invalid deselection and out-of-range movement are prevented.

Builds currently fetch Google Fonts and require network access. External CI
must restore managed skill links with `loom init` after the frozen install.
Local Google credentials and all imported patient data remain outside Git.

## Final verification additions

- Full local suite: 74 tests across 20 files at the current checkpoint.
- All three production-build browser journeys passed; treatment and protected
  runtime checks were repeated after alias/form changes.
- Live Neon tests passed for competing connections: identical retry receipts,
  one-winner version conflict, exact Unicode/BOM round trip, import writer lock
  and concurrent completed-import replays.
- Actual app checks passed against the protected import for all three owners,
  exact treatment projections, loaded body points and a legacy bookmark.
  Temporary sessions were deleted and exact replay passed afterwards.
- `loom check --production --network` passed all seven provider/release checks.
  The app intentionally owns `db:migrate` so its strict pg transport enforces
  channel binding; Loom reports the preserved custom task as advisory. The actual
  migration entrypoint passed on synthetic and protected rehearsal branches.
- A primary Mongo snapshot exactly matched all raw BSON documents in the backup.
  The dedicated legacy credential still has write privileges until cutover.

The form approach was checked against Porty3: Valibot with React Hook Form and
a small MUI registration wrapper. Published Loom 2.0.4 has no form export, so the
app retains that wrapper; no shared-package change was needed for this adoption.

The standalone Vercel Production prebuild and placeholder scan passed, then an
additional exact-value scan found copied local dotenv files. Nothing was uploaded;
that generated output was removed. Local release builds now use an isolated source
snapshot, and a tested artifact policy rejects private env files and mappings.
The rehearsal maintenance command also passed a source-free completed retry in
a new process with a deliberately absent backup path.

The isolated standalone build passed both the placeholder scan and the app's
private-file policy. Exact-value scanning of 1,785 source/deployable files found
no local or Production credential values. The rejected working-tree artifact
was removed, and no deployment was uploaded.
