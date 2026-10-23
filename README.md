# MyReiki

Practice management for Reiki practitioners. Previously named MyHolpra; the
schema retains generic treatments for future modalities.

The working tree now uses Next.js 16, React 19, MUI 9, Better Auth, Valibot with
React Hook Form, Neon/PostgreSQL and an owner-scoped Dexie offline store. Bun
1.4.3 manages dependencies and tasks; Node 24 runs the server. Loom 2.2.0 supplies
shared auth, database, PWA, Lingui tooling and client identity primitives.

Production is live at [www.myreiki.app](https://www.myreiki.app) on the modern
SQL stack. The production import, release workflow, deployed browser checks and
operator's existing-account Google sign-in/record check passed. The dedicated
Mongo user is deleted and its old credential is verified unusable. Both the
apex and old Vercel hostname redirect to the canonical domain.
See [production acceptance](plans/008-production-acceptance.md),
[implementation evidence](plans/001-modernization.md),
[dependency decisions](plans/002-upgrade-ledger.md) and
[release/recovery boundaries](plans/003-release-and-recovery.md).

The release workflow uses GitHub OIDC Trusted Sources for protected
HTTP checks, with a read-only `oidc-smoke` operation separate from deployment.
Live identity acceptance passed and the old persistent bypass is retired. See
[OIDC implementation and acceptance](plans/009-oidc-implementation.md).

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
and loopback-only. The operator confirmed real Google sign-in locally and on the production domain.

The offline store preserves edits across reloads and account switches. Sign-out
locks access and retains pending work for the same account; reconnecting freshly
authorizes every replay. There is no app-imposed offline expiry. Browser storage
can still be removed by the browser or operating system. Account settings offer
persistent-storage requests, private device export and explicit device removal.
Old Gongo pending work is outside the requested recovery scope.

English is the source language; Japanese is available from the language selector
below About in the menu drawer.
The saved device preference wins over browser language negotiation. Both catalogs
are bundled for offline switching, which preserves open form drafts and unsynced
work. User-entered names and notes are never translated. Dates and picker controls
follow the selected language; stored dates and treatment type codes stay unchanged.

For copy changes, use `<Trans>` from `@lingui/react/macro`, or `msg` from
`@lingui/core/macro` and the component's `useLingui()` instance. Server Components
that use translation macros must call `initRequestI18n()` in their own render.
Never use the global `t` macro in client components. Run `bun run i18n:extract`,
translate missing Japanese entries in `src/locales/ja/messages.po`, then run
`bun run check` and `bun run build`. Generated ESM `.mjs` catalogs are ignored and
compiled before development, validation and builds. See
[localization decisions and evidence](plans/005-localization.md).

Drizzle schemas are in `src/db/schema`; use `bun run db:generate` and
`bun run schema:gen`. Migrations require `pg_uuidv7`. The app's pg adapter
verifies Neon TLS and required SCRAM channel binding. The app-owned `db:migrate` uses this same transport; its intentional Loom task
override is advisory. Protected migration credentials and the complete staged
production release path are verified.

Production releases remain explicitly gated. The one-time release enablement
was removed after successful cutover; future approved releases must enable it
for their run and remove it afterward. Automatic Vercel deployments from `main` are
fenced by `vercel.json`. Production auth/data routes also require the exact
completed import receipt. Passing local checks alone does not activate production.

MongoDB remains a development dependency for backup inventory/import tools.
Runtime Gongo, the Mongo relay and experimental uploads are retired. The dump
contains no files collection or domain attachment references; no object-store
recovery claim is made.

Copyright (c) 2024 Gadi Cohen. [MIT Licensed](LICENSE.txt).
