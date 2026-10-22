# OIDC implementation and acceptance

22 October 2026. Operator requested the Trusted Sources follow-up and shared
Loom extraction. Implementation is in progress; live GitHub acceptance and
persistent bypass retirement remain pending.

The fresh MyReiki trust plan matched the earlier proposal byte-for-byte. Its
reviewed digest is `57e7e3f2cd2c6f51754c3c2e50b6c898dac67275094ccc1523550dc1afaf4565`.
`trust-apply` and `trust-check` succeeded. The rule accepts only GitHub's issuer,
audience `https://github.com/gadicc`, repository `gadicc/myreiki`, repository ID
`791451279`, ref `refs/heads/main`, GitHub environment `Production` and workflow
`gadicc/myreiki/.github/workflows/release.yml@refs/heads/main`, targeting only
Vercel production. No unrelated policy fields changed. Existing bypass remains
valid until acceptance.

Loom's additive `@gadicc/loom/release` export owns token acquisition, masking,
expiry-aware reuse and HTTP origin confinement. It uses portable Web APIs and
supports read-only GET/HEAD requests. There is no bypass fallback and no redirect
following. Vercel verifies signature and policy; decoded JWT claims only guide
cache expiry and configuration sanity. Magickli and Majou already use app-local
OIDC acquisition. Other reference apps were inventoried; migration stays
per-consumer, especially Shadowlang's custom beta environment.

MyReiki retains artifact/project/owner/source verification, database readiness,
application session assertions and alias identity checks. The new manual
`oidc-smoke` path reads the current protected immutable live artifact without
building, deploying, importing, migrating or promoting. It requires anonymous
protection denial, valid OIDC readiness and a null app session, wrong-audience
denial, then a separate no-environment job requires denial with the correct
audience. That second job receives only the verified origin, without Production
environment or provider/database secrets. The production alias is rechecked.
The retired bootstrap smoke expected an inactive database and is deliberately
removed now that production is active. Normal release promotion remains gated
by `MYREIKI_PRODUCTION_RELEASE_ENABLED`; OIDC acceptance cannot enable it.

OIDC access covers Deployment Protection HTTP checks. Deployment API credentials,
Neon migration credentials, application sign-in, browser origin routing and local
operator access remain separate. `id-token: write` applies to every step in its
job; actions and dependencies remain pinned and provider secrets stay step-scoped.

Local verification: Loom commit `bdda15f23865653e3cbc4836407d67d7ec888e1f` passed
1,560 Bun runtime tests plus 33 DOM tests, Deno parity (167 groups / 1,609
steps), browser type compatibility, quality gates and ESM packaging. MyReiki
passed all 83 tests in 22 files, lint/type checks, actionlint 1.7.7 and a local
production build. These results use the managed unpublished Loom generation;
the published-package production gate also passed with the exact registry
version `2.1.0` (source `933e6a54831bf15b6d18539bfbb588551e2e9e58`).
The published-package production build also passed.
[Loom publication](https://github.com/gadicc/loom/actions/runs/39846938558) passed.
The OIDC maintenance branch is explicitly excluded from Vercel Git deployments
to keep this rollout free of Preview uploads as well as production deployment.

The credential-free proposal is retained at `.github/vercel-release-trust.json`
for later `bun run loom db release trust-check .github/vercel-release-trust.json`.

Before acceptance, publish the shared Loom release, install its exact registry
version here, pass both repositories' full gates and review the diff. Then merge
the app workflow, run the bounded smoke and retain sanitized run evidence.
Only after both jobs pass, delete the Production GitHub bypass secret and revoke
that exact Vercel bypass. Preserve the project token and migration credential.
Never print raw tokens, provider env snapshots or unredacted CI logs.

Sources: [Vercel Trusted Sources](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources)
and [GitHub OIDC claims](https://docs.github.com/en/actions/reference/security/oidc).


The first live checks confirmed valid OIDC readiness and a null app session, but
failed while acquiring the deliberately different audience. Loom 2.1.1 adds
fixed, credential-free acquisition failure phases instead of exposing provider
bodies or causes. Its full local gate passed (1,561 runtime tests, 33 DOM tests,
167 Deno groups / 1,610 steps), and its
[publication run](https://github.com/gadicc/loom/actions/runs/39849546333) passed
on retry after an unchanged compiler test exceeded Bun's five-second timeout.
MyReiki's published-package production gate now passes all 84 tests, including a
child-process regression for private transport-detail suppression. Live
acceptance remains pending; the persistent bypass is still active.

The phase-aware run isolated the negative probe's failure to GitHub HTTP 400,
before token issuance. The wrong-audience probe now requests the standard
`sts.amazonaws.com` audience instead. Vercel must still deny the resulting
GitHub-signed token because the reviewed rule requires
`https://github.com/gadicc`; no trust or readiness condition changed.
