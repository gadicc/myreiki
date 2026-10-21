# English and Japanese localization

21 October 2026. User requested Lingui following Sababa and Shadowlang, with
English as the base language and Japanese as the only additional public language.
The Loom and Loom Lingui skills govern the feature wiring and generated output.

## Implementation

- Preserve existing URLs, including historical record bookmarks. Shadowlang's
  cookie-based locale model fits this private practice app; Sababa's locale URL
  hierarchy is unnecessary here. The server uses a validated `NEXT_LOCALE`, then
  weighted browser language tags, then English. No authenticated lookup is needed.
- Instantiate Lingui separately per request and per mounted client tree. Both
  compiled catalogs ship with the shell, so switching works without a network
  request. Switch the context in a React transition without remounting forms. Never mutate
  a locale instance that an old Suspense boundary may still need for hydration.
- Save the UI preference in a cookie and localStorage. Restore it after hydration
  when an offline cached shell predates the choice, and synchronize browser tabs.
  The preference is not account identity and never grants data access.
- Tag navigation, lists, form labels, accessibility text, account/offline controls,
  spreadsheet feedback and PWA prompts. Translate known validation and storage
  messages at the display boundary, retaining internal diagnostic/protocol values.
  Unexpected technical errors use a translated generic recovery message.
- Format dates with the active locale, including MUI picker controls. Keep user
  text, source/import rows, ISO values, ownership, stored subtype codes, UUIDs,
  queue order and synchronization semantics unchanged. Spreadsheet instructions
  explain the unchanged English subtype tokens; the preview labels are localized.
- Japanese terminology includes 霊気, 病腺, 師範格 and 性癖改善. The MyReiki brand
  stays the same. No translation service receives patient records or UI content.
- Use Lingui's SWC macro transform for Next and its Babel macro transform in
  Vitest. Tests exercise compiled messages and real Lingui providers. Catalogs
  use ESM `.mjs` output because this app has `type: module`; CommonJS defaults
  fail the Turbopack production build. Generated output remains ignored.

## Review boundaries

Reviewed with the Loom Torvalds web-application profile: request isolation,
hydration, stale cached shells, form/queue survival, locale validation, storage
failure, technical-error leakage, plural placeholders and persisted data types.
No shared Loom source change or new database migration was needed.

Locale-aware request headers make page rendering dynamic. The service worker
still precaches the static bundles, including both catalogs; visited page shells
use the existing runtime cache. Private APIs remain network-only and records
remain in owner-scoped IndexedDB.

## Verification

- Catalog extraction: 170 entries, zero missing Japanese translations or fuzzy
  entries. Both catalogs compile to ESM.
- `bun run check`: 81 tests across 22 files, Biome, TypeScript and Loom wiring.
  The existing app-owned migration task remains an intentional Loom advisory.
- Production Next/Turbopack build and Serwist build pass; the worker precaches
  49 static URLs (2.61 MB), including both languages.
- Frozen Bun installation and Loom production/skill checks pass. Optional
  external skill recommendations remain unadopted.
- Local development rendering returns a Japanese document and translated About
  page for `Accept-Language: ja-JP`.

All five production-mode Chromium journeys pass. Browser acceptance covers language negotiation, saved choice, unsaved drafts,
localized validation, offline persistence/reload, same-owner synchronization,
date picker labels, Byosen controls, account isolation, private API cache
exclusion, treatment cloning and repeated spreadsheet import. The locale journey
asserts no browser page errors, including hydration errors.

Production remains on the legacy deployment until the separately gated release
and Mongo/SQL cutover. Localization changes invalidate the earlier frozen source
proposal; release artifacts and the read-only proposal must bind the new commit.
