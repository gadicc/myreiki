# Primary production domain

The operator selected `https://www.myreiki.app` as the primary production
origin. Vercel verified both custom domains and redirects the apex to `www` with
HTTP 308, preserving the request path and query. Production now serves the
accepted SQL deployment; the old Vercel hostname also redirects to `www`. See
[production acceptance](008-production-acceptance.md).

Production `BETTER_AUTH_URL`, the application's fallback origin and release
verification now use `https://www.myreiki.app`. The operator updated Google's
authorized origins and callbacks; the production callback is
`https://www.myreiki.app/api/auth/callback/google`. Local and Preview origins
keep their existing independent configuration.

Staged deployment verification still requires a Vercel immutable hostname that
matches provider metadata. Promoted verification requires the exact canonical
custom origin and exact expected deployment ID, owner, project and source SHA.
An arbitrary custom host, the apex redirect, a different immutable URL, ports,
paths and lookalike hostnames cannot substitute for that live origin.

The Mongo writer fence, completed production import and unchanged typed replay
were verified before this domain update. The earlier accepted staged artifact
uses the previous origin; its account and browser evidence remains a checkpoint,
not proof that it contains this domain change. The reviewed domain change was
merged and the project-scoped GitHub release built, staged, verified and promoted
the updated source. Canonical alias and redirects passed; the operator confirmed
production Google sign-in and records before deleting the dedicated Mongo user.
Fresh authentication denial is verified. Keep backups and the SQL recovery path.

Browser cookies and offline storage are origin-specific. Existing local or
Vercel-hosted sessions do not transfer to the new domain; the agreed one-time
sign-in applies. Recovery of historical Gongo device queues is outside scope.
