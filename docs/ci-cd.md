# CI/CD

This repository now includes GitHub Actions workflows for CI, Docker image publishing, Railway deploys, Vercel deploys, and an opt-in VPS deployment path.

## Workflows

- `CI`: runs `web-new` lint, tests, and build; runs `workers` tests; builds Docker images for both services; pushes images to GHCR on `main`
- `Deploy Workers to Railway`: deploys `workers/` after CI succeeds on `main`, or manually with `workflow_dispatch`
- `Deploy Web to Vercel`: deploys `web-new/` after CI succeeds on `main`, or manually with `workflow_dispatch`
- `Deploy Full Stack to VPS`: manual-only deployment of `web-new`, `workers`, `postgres`, and `redis`; disabled unless `ENABLE_VPS_DEPLOY=true`

## Sync Script

Use `scripts/sync-github-env.sh` to push local env values into the GitHub secrets and variables used by these workflows.

Default behavior:

- loads `.env.github`, `web-new/.env.local`, `workers/.env`, and `deploy/vps/.env` if they exist
- syncs exact GitHub names like `VERCEL_TOKEN` and `RAILWAY_PROJECT_ID`
- maps app env names like `AUTH_SECRET` to workflow names like `VPS_AUTH_SECRET`
- skips empty values so blank local entries do not wipe GitHub settings
- triggers `ci.yml` with `workflow_dispatch` after a successful sync

Examples:

```bash
scripts/sync-github-env.sh
scripts/sync-github-env.sh --dry-run
scripts/sync-github-env.sh --env-file .env.github --ci-ref main
scripts/sync-github-env.sh --no-run-ci
```

Start from `.env.github.example` if you want one file that holds the GitHub-specific names.

## GHCR Images

The CI workflow publishes these images on `main`:

- `ghcr.io/<owner>/agentrader-web-new:main`
- `ghcr.io/<owner>/agentrader-web-new:sha-<short-sha>`
- `ghcr.io/<owner>/agentrader-workers:main`
- `ghcr.io/<owner>/agentrader-workers:sha-<short-sha>`

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
- `VPS_AUTH_SECRET`
- `VPS_CRON_SECRET`
- `VPS_POSTGRES_PASSWORD`
- `VPS_REDIS_PASSWORD`

Optional secrets, depending on your runtime mode:

- `VPS_DATABASE_URL`
- `VPS_REDIS_URL`
- `VPS_MASSIVE_API_KEY`
- `VPS_BINANCE_API_KEY`
- `VPS_POLYMARKET_API_KEY`
- `VPS_GOOGLE_CLIENT_ID`
- `VPS_GOOGLE_CLIENT_SECRET`
- `VPS_GITHUB_CLIENT_ID`
- `VPS_GITHUB_CLIENT_SECRET`

Useful variables:

- `VPS_APP_DIR`
- `VPS_WEB_IMAGE`
- `VPS_WORKERS_IMAGE`
- `VPS_NEXT_PUBLIC_APP_URL`
- `VPS_AUTH_URL`
- `VPS_DATABASE_SSL`
- `VPS_MARKET_DATA_MODE`
- `VPS_COMPETITION_PHASE`
- `VPS_BRIEFING_WINDOW_MINUTES`
- `VPS_POSTGRES_DB`
- `VPS_POSTGRES_USER`
- `VPS_WORKER_ENABLE_SCHEDULER`
- `VPS_WORKER_APP_URL`
- `VPS_BINANCE_ENABLED`
- `VPS_MASSIVE_ENABLED`
- `VPS_MASSIVE_SYMBOLS`
- `VPS_MASSIVE_RECENT_SYMBOL_LIMIT`

## Notes

- `web-new` deploys through Vercel CLI from GitHub Actions instead of relying on the GitHub app auto-deploy.
- `workers` deploys through Railway CLI from GitHub Actions.
- The VPS path is manual-only and intended as a fallback or self-hosted environment.
- `web-new` live SQL tests are still opt-in and are not part of the default CI workflow.
