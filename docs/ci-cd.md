# CI/CD

This repository now includes GitHub Actions workflows for CI, Docker image publishing, Railway deploys, Vercel deploys, and an opt-in VPS deployment path.

## Workflows

- `CI`: runs `web-new` tests and build; runs `workers` tests; builds Docker images for both services; uploads Docker tarball artifacts for both services on every run; pushes images to GHCR only when a GitHub release is published
- `Deploy Workers to Railway`: deploys `workers/` after CI succeeds on `main`, or manually with `workflow_dispatch`
- `Deploy Web to Vercel`: deploys `web-new/` after CI succeeds on `main`, or manually with `workflow_dispatch`
- `Deploy Full Stack to VPS`: manual-only deployment of `web-new`, `workers`, `postgres`, and `redis`; disabled unless `ENABLE_VPS_DEPLOY=true`

Railway and Vercel deploys first upsert runtime envs from the environment-scoped `ENV_CONTENT` secret, then run the platform deploy.

## Env Control

Use `scripts/envctl` to merge root env sources, generate service env files, and sync GitHub Environment-scoped secrets and variables.

`envctl` derives service keys from:

- `web-new/.env.example`
- `workers/.env.example`

GitHub target keys are deduplicated unions:

- `github:vps` = `.env.vps` + `web-new` + `workers`
- `github:vercel` = `.env.vercel` + `web-new`
- `github:railway` = `.env.railway` + `workers`

Secret vs variable classification is controlled by one central `SECRETS_KEYS` list inside `scripts/envctl`.
Keys that contain `secret`, `password`, `key`, or `token` are also treated as secrets by heuristic unless you override that by changing the script.

Source files:

- `.env.prod`
- `.env.vps`
- `.env.vercel`
- `.env.railway`

Each command takes a comma-separated source list. Later sources override earlier ones.

Examples:

```bash
scripts/envctl --input prod,vercel --output web-new/.env
scripts/envctl --input prod,railway --output workers/.env
scripts/envctl --input prod,vps --output github:vps
scripts/envctl --input prod,vercel --output github:vercel
scripts/envctl --input prod,railway --output github:railway
scripts/envctl --input prod,vps --output github:vps --run-ci
scripts/envctl --output github:vps --show-keys
scripts/envctl --local
scripts/envctl --github
```

Use `--show-keys` to inspect the resolved target key list and whether each key is classified as `secret` or `variable`. When `--show-keys` is used, `envctl` only prints keys and does not read input values, write files, sync GitHub settings, or trigger CI.

For `github:*` outputs, `envctl` skips empty values and writes to GitHub Environments named `vps`, `vercel`, and `railway`. It batches each target into one `gh secret set -f -` call and one `gh variable set -f -` call. Runtime envs are packed into a single `ENV_CONTENT` secret per environment. It does not trigger `ci.yml` unless `--run-ci` is passed.

Preset behavior:

- `--local`: generates `web-new/.env` from `prod,vercel` and `workers/.env` from `prod,railway`
- `--github`: syncs `github:vps`, `github:vercel`, and `github:railway`; add `--run-ci` to trigger `ci.yml` once at the end

Start from these examples:

- `.env.prod.example`
- `.env.vps.example`
- `.env.vercel.example`
- `.env.railway.example`

## GHCR Images

The CI workflow publishes images to GHCR only for `release.published` events.

Each release publishes three tags per service:

- branch tag: `ghcr.io/<owner>/agentrader-web-new:<branch>`
- hash tag: `ghcr.io/<owner>/agentrader-web-new:git-<short-sha>`
- release tag: `ghcr.io/<owner>/agentrader-web-new:<release-tag>`
- branch tag: `ghcr.io/<owner>/agentrader-workers:<branch>`
- hash tag: `ghcr.io/<owner>/agentrader-workers:git-<short-sha>`
- release tag: `ghcr.io/<owner>/agentrader-workers:<release-tag>`

## Docker Artifacts

Each CI run also uploads Docker image tarballs as GitHub Actions artifacts:

- `docker-image-web-new`
- `docker-image-workers`

You can load them locally or on a server with:

```bash
docker load -i docker-image-web-new.tar
docker load -i docker-image-workers.tar
```

## GitHub Secrets And Variables

The deploy workflows use GitHub Environments:

- `vps`
- `vercel`
- `railway`

`scripts/envctl --output github:<target>` writes secrets and variables into the matching environment.

### Railway

Secrets:

- `RAILWAY_TOKEN`
- `RAILWAY_API_TOKEN` as fallback when you are not using a project token
- `ENV_CONTENT` for worker runtime envs synced into Railway before deploy

Variables:

- `RAILWAY_PROJECT_ID`
- `RAILWAY_ENVIRONMENT_ID`
- `RAILWAY_WORKERS_SERVICE`

### Vercel

Secrets:

- `VERCEL_TOKEN`
- `ENV_CONTENT` for web runtime envs synced into Vercel before deploy

Variables:

- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### VPS

Set repository variable `ENABLE_VPS_DEPLOY=true` only when you want to allow the manual VPS workflow.

Required secrets:

- `VPS_HOST`
- `VPS_USERNAME`
- `VPS_SSH_KEY`
- `GHCR_READ_TOKEN`
- `ENV_CONTENT` for combined web and worker runtime envs
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`

Optional secrets, depending on your runtime mode:

- runtime keys are typically stored inside `ENV_CONTENT`

Useful variables:

- `VPS_APP_DIR`
- `VPS_WEB_IMAGE`
- `VPS_WORKERS_IMAGE`
- `POSTGRES_DB`
- `POSTGRES_USER`
- runtime keys are typically stored inside `ENV_CONTENT`

Manual VPS deploy accepts:

- `image_tag`: optional registry tag to deploy; leave it empty to deploy the commit selected in GitHub's `Use workflow from` picker

Deploy behavior:

- if `image_tag` is set, the workflow deploys that exact GHCR tag and fails if either service image is missing
- if `image_tag` is empty, the workflow uses the commit selected in GitHub's `Use workflow from` picker, first tries the release-published `git-<short-sha>` images in GHCR, and falls back to the successful `CI` artifacts for that same commit when the registry images do not exist
- artifact fallback is intended for unreleased or development commits that were built by `CI` but not published to GHCR

## Notes

- `web-new` deploys through Vercel CLI from GitHub Actions instead of relying on the GitHub app auto-deploy.
- `workers` deploys through Railway CLI from GitHub Actions.
- The VPS path is manual-only and intended as a fallback or self-hosted environment.
- `web-new` live SQL tests are still opt-in and are not part of the default CI workflow.
