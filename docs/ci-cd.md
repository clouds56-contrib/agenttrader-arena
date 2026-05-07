# CI/CD

This repository now includes GitHub Actions workflows for CI, Docker image publishing, Railway deploys, Vercel deploys, and an opt-in VPS deployment path.

## Workflows

- `CI`: runs `web-new` tests and build; runs `workers` tests; builds Docker images for both services; uploads Docker tarball artifacts for both services; pushes images to GHCR on `main`
- `Deploy Workers to Railway`: deploys `workers/` after CI succeeds on `main`, or manually with `workflow_dispatch`
- `Deploy Web to Vercel`: deploys `web-new/` after CI succeeds on `main`, or manually with `workflow_dispatch`
- `Deploy Full Stack to VPS`: manual-only deployment of `web-new`, `workers`, `postgres`, and `redis`; disabled unless `ENABLE_VPS_DEPLOY=true`

## Env Control

Use `scripts/envctl` to merge root env sources, generate service env files, and sync GitHub secrets and variables.

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
scripts/envctl --local
scripts/envctl --github
```

For `github:*` outputs, `envctl` skips empty values and does not trigger `ci.yml` unless `--run-ci` is passed.

Preset behavior:

- `--local`: generates `web-new/.env` from `prod,vercel` and `workers/.env` from `prod,railway`
- `--github`: syncs `github:vps`, `github:vercel`, and `github:railway`; add `--run-ci` to trigger `ci.yml` once at the end

Start from these examples:

- `.env.prod.example`
- `.env.vps.example`
- `.env.vercel.example`
- `.env.railway.example`

## GHCR Images

The CI workflow publishes these images on `main`:

- `ghcr.io/<owner>/agentrader-web-new:main`
- `ghcr.io/<owner>/agentrader-web-new:sha-<short-sha>`
- `ghcr.io/<owner>/agentrader-workers:main`
- `ghcr.io/<owner>/agentrader-workers:sha-<short-sha>`

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

### Railway

Secrets:

- `RAILWAY_TOKEN`

Variables:

- `RAILWAY_PROJECT_ID`
- `RAILWAY_ENVIRONMENT_ID`
- `RAILWAY_WORKERS_SERVICE`

### Vercel

Secrets:

- `VERCEL_TOKEN`

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
- `AUTH_SECRET`
- `CRON_SECRET`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`

Optional secrets, depending on your runtime mode:

- `DATABASE_URL`
- `REDIS_URL`
- `MASSIVE_API_KEY`
- `BINANCE_API_KEY`
- `POLYMARKET_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Useful variables:

- `VPS_APP_DIR`
- `VPS_WEB_IMAGE`
- `VPS_WORKERS_IMAGE`
- `NEXT_PUBLIC_APP_URL`
- `AUTH_URL`
- `DATABASE_SSL`
- `AGENTTRADER_MARKET_DATA_MODE`
- `AGENTTRADER_COMPETITION_PHASE`
- `AGENTTRADER_BRIEFING_WINDOW_MINUTES`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `WORKER_ENABLE_SCHEDULER`
- `WORKER_APP_URL`
- `BINANCE_ENABLED`
- `BINANCE_BASE_URL`
- `MASSIVE_ENABLED`
- `MASSIVE_BASE_URL`
- `MASSIVE_SYMBOLS`
- `MASSIVE_RECENT_SYMBOL_LIMIT`

## Notes

- `web-new` deploys through Vercel CLI from GitHub Actions instead of relying on the GitHub app auto-deploy.
- `workers` deploys through Railway CLI from GitHub Actions.
- The VPS path is manual-only and intended as a fallback or self-hosted environment.
- `web-new` live SQL tests are still opt-in and are not part of the default CI workflow.
