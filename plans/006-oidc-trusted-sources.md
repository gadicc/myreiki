# OIDC Trusted Sources follow-up

Implementation started 22 October 2026; see [current implementation and acceptance](009-oidc-implementation.md). The assessment below records the pre-adoption state.

21 October 2026. The operator approved creating the existing MyReiki automation
credential and requested an assessment of OIDC and shared Loom reuse. OIDC
adoption is deferred; no Trusted Sources settings or release workflow changed.

## Fit for MyReiki

GitHub Actions can request a short-lived, GitHub-signed OIDC token and send it
in `x-vercel-trusted-oidc-idp-token` to the exact staged deployment origin.
Vercel checks the signature, configured identity claims and target environment.
This can replace the persistent bypass for CI readiness, API and browser checks.
A browser harness must attach the header only to the approved origin, including
its asset/API requests, without sending it to Google or another external origin.

This is HTTP Deployment Protection access. The project-scoped Vercel deployment
API token, Neon migration credential and normal application sign-in remain
separate. A local process cannot mint the matching GitHub job identity; local
and human acceptance need their own permitted access. OIDC does not make the
staged deployment public.

The prepared rule is limited to this Vercel project's production environment
and requires all of the following to match:

- GitHub issuer `https://token.actions.githubusercontent.com`.
- Audience `https://github.com/gadicc`.
- Canonical repository `gadicc/myreiki` and its immutable repository ID.
- Ref `refs/heads/main` and GitHub environment `Production`.
- Workflow ref `gadicc/myreiki/.github/workflows/release.yml@refs/heads/main`.

## Existing shared support

Loom 2.0.4 already ships `loom db release trust-plan`, `trust-apply` and
`trust-check`. The planner reads the linked Vercel and canonical GitHub identity
and saves a credential-free proposal. Its approval digest binds the target,
expected provider configuration and proposed patch. Apply checks for stale
provider state, preserves unrelated rules and verifies the resulting state.

The MyReiki read-only plan succeeded and is retained privately for review. It
has not been applied. No shared package implementation is needed for this part.

A future consumer rollout should:

1. Review/regenerate and explicitly apply the exact app-specific trust proposal.
2. Give the release job `id-token: write`, obtain and mask the token, and pass it
   only to the verified staged origin. Adapt MyReiki's existing origin checks,
   redirect refusal and readiness/import-fence assertions.
3. Run the credential-only staging path with OIDC, covering both positive access
   and mismatched identity denial. Keep application auth assertions separate.
4. After acceptance, remove the old bypass secret from GitHub and revoke it in
   Vercel. Preserve the deployment API and migration credentials.

The useful next shared addition would be a tested workflow example or narrowly
scoped helper for token acquisition and safe HTTP header handling, once repeated
consumer wiring establishes its contract. App-specific health checks, database
activation and promotion decisions should stay app-owned. This can follow the
initial MyReiki cutover rather than changing release mechanisms mid-migration.

References: [Vercel Trusted Sources](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources),
[GitHub OIDC](https://docs.github.com/en/actions/reference/security/oidc).
