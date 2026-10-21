# MyReiki

Practice management for Reiki practitioners. Previously named MyHolpra; the
schema retains generic treatments for future modalities.

The working tree now uses Next.js 16, React 19, MUI 9, Better Auth, Valibot with
React Hook Form, Neon/PostgreSQL and an owner-scoped Dexie offline store. Bun
1.4.3 manages dependencies and tasks; Node 24 runs the server. Loom 2.0.4 supplies
shared auth, database, PWA and client identity primitives.

**Production still runs the legacy Mongo application.** Provider ownership and
Singapore placement are configured, and the Mongo backup has been imported and
compared on a protected rehearsal branch. The Production SQL branch has not
been populated or activated. The implementation is saved on the local `codex/modernize-myreiki` review branch.
See [current evidence](plans/001-modernization.md),
[dependency decisions](plans/002-upgrade-ledger.md) and the
[cutover gates](plans/003-release-and-recovery.md).

```sh
bun install --frozen-lockfile --ignore-scripts
bun run loom init
bun run dev
```

Use Node 24 and configure `.env.local` from `.env.example`. Local development
and Vercel Preview use an independent synthetic Neon root. Patient backup data
belongs only in the protected rehearsal and approved Production target. Next
loads its own environment; standalone tools use `bun run loom env -- <command>`.

```sh
bun run check
bun run build
bun run loom skills check
bun run check:production
# After a production build, with a compatible Chromium installed:
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:browser
```

The browser harness refuses every database except the approved synthetic root.
Its test-only Better Auth instance creates session cookies without adding
production HTTP bypasses. `/dev-login` is separately opt-in, development-only
and loopback-only. Real Google sign-in was also confirmed locally by the operator.

The offline store preserves edits across reloads and account switches. Sign-out
locks access and retains pending work for the same account; reconnecting freshly
authorizes every replay. There is no app-imposed offline expiry. Browser storage
can still be removed by the browser or operating system. Account settings offer
persistent-storage requests, private device export and explicit device removal.
Old Gongo pending work is outside the requested recovery scope.

Drizzle schemas are in `src/db/schema`; use `bun run db:generate` and
`bun run schema:gen`. Migrations require `pg_uuidv7`. The app's pg adapter
verifies Neon TLS and required SCRAM channel binding. The app-owned `db:migrate` uses this same transport; its intentional Loom task
override is advisory. Protected migration credentials are configured; a full
staged release still needs its runtime acceptance checks.

The release workflow is disabled until the explicit repository release switch
is enabled after cutover review. Automatic Vercel deployments from `main` are
fenced by `vercel.json`. Production auth/data routes also require the exact
completed import receipt. Passing local checks alone does not activate production.

MongoDB remains a development dependency for backup inventory/import tools.
Runtime Gongo, the Mongo relay and experimental uploads are retired. The dump
contains no files collection or domain attachment references; no object-store
recovery claim is made.

Copyright (c) 2024 Gadi Cohen. [MIT Licensed](LICENSE.txt).
