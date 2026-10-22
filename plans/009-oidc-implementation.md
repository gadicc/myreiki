# OIDC implementation and acceptance

22 October 2026. Loom 2.1.1 is published and adopted on MyReiki main. The
production Trusted Sources rule and live identity checks passed, and the
persistent MyReiki bypass is retired. The
[post-retirement acceptance run](https://github.com/gadicc/myreiki/actions/runs/39851742571)
also passed both identity jobs with deployment skipped.

The rule accepts only GitHub's issuer, audience `https://github.com/gadicc`,
repository `gadicc/myreiki`, immutable repository ID `791451279`, ref
`refs/heads/main`, GitHub environment `Production` and workflow
`gadicc/myreiki/.github/workflows/release.yml@refs/heads/main`, targeting only
Vercel production. The reviewed proposal digest is
`57e7e3f2cd2c6f51754c3c2e50b6c898dac67275094ccc1523550dc1afaf4565`.
`trust-apply` and subsequent `trust-check` readbacks passed. The credential-free
proposal is committed at `.github/vercel-release-trust.json` for later checks:

```sh
bun run loom db release trust-check .github/vercel-release-trust.json
```

Loom's `@gadicc/loom/release` export owns masked token acquisition, concurrent
reuse, refresh before expiry and GET/HEAD requests confined to one app-verified
HTTPS origin. It never follows redirects or falls back to a bypass secret.
Acquisition errors expose only fixed failure phases and numeric HTTP status,
without provider bodies, URLs, token values or causes. Vercel verifies signature
and identity policy; decoded claims only guide cache expiry and sanity checks.
MyReiki owns provider/project/artifact verification, readiness, application auth
and canonical alias checks.

[Live acceptance](https://github.com/gadicc/myreiki/actions/runs/39851084034)
passed at source `88c09d1363cdb45e83ab670203cee4a5f6940e4f`:

- Anonymous access to the immutable artifact reaches Vercel's protection gate.
- The permitted GitHub identity gets JSON readiness with `ready: true`, HTTP 200
  and `no-store`; application session remains `null`.
- A GitHub-signed token with audience `sts.amazonaws.com` is denied by Vercel.
- A separate job with the correct audience but no `Production` environment is
  denied. It receives only the verified origin and no provider/database secrets.
- The deployment job is skipped and the public artifact stays unchanged.

An initial custom negative-test audience was rejected by GitHub with HTTP 400
before issuance. That response was never counted as Vercel denial. The final
probe uses a supported standard audience and requires a signed token with that
exact audience before testing Vercel. This investigation prompted the shared
credential-free failure phases and an app CLI redaction regression.

The approved bypass, fingerprint prefix `065c2a8fa65d`, was removed from GitHub's
`Production` environment and revoked in Vercel without replacement. Fresh
read-only reconciliation verified both removals, the old credential's protection
denial, unchanged Trusted Sources and the preserved deployment/migration
credentials. The initial immediate readback stopped before a receipt was written;
the mutations were not repeated. The final private, credential-free receipt is
`.private/oidc-bypass-retirement.json`, verified at `2026-10-22T20:45:58.253Z`.
The revoked credential recovery file was deleted.

Production remains on deployment `dpl_ZHAaJGauLjQahorywvrjK7wqqtep`, source
`2375e68852276ca06bf949ff8b17eaca732c3740`, at `https://www.myreiki.app`.
This rollout did not deploy the app, import data, run migrations or promote
aliases. The maintenance branch was fenced from Preview deployments during the
work. Main's automatic Vercel deployment fence and the absent
`MYREIKI_PRODUCTION_RELEASE_ENABLED` flag continue to gate future releases.

Verification passed with the exact published Loom 2.1.1 package: all 84 app
tests in 22 files, lint/types, `loom check --production`, actionlint 1.7.7 and the
local production build. The intentional app-owned migration task remains an
advisory because it uses the project's TLS/channel-binding transport.
Loom's full local gate passed 1,561 runtime tests plus 33 DOM tests, Deno parity
(167 groups / 1,610 steps), browser type compatibility and ESM packaging.
[Patch publication](https://github.com/gadicc/loom/actions/runs/39849546333)
passed on retry after an unchanged compiler test exceeded Bun's five-second
limit. The first [feature release](https://github.com/gadicc/loom/actions/runs/39846938558)
also passed its full gate.

OIDC covers Deployment Protection HTTP checks. The project-scoped deployment API
credential, Neon migration credential and normal application sign-in remain
separate. Local operators and browser-origin routing need their own adapters.
`id-token: write` is job-scoped; actions and dependencies remain pinned and
provider secrets are step-scoped.

Magickli and Majou informed the shared extraction. Other active reference apps
were inventoried and remain unchanged. Each consumer adopts its own reviewed
policy and live checks; Shadowlang's custom beta environment needs a separate
policy review. Publishing Loom does not migrate the fleet.

Sources: [Vercel Trusted Sources](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources)
and [GitHub OIDC claims](https://docs.github.com/en/actions/reference/security/oidc).
