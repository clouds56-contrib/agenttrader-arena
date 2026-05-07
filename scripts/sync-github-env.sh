#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT_DIR"

declare -A ENV_VALUES=()
declare -A TARGET_VALUES=()
declare -A TARGET_KINDS=()

DEFAULT_FILES=(
  ".env.github"
  "web-new/.env.local"
  "workers/.env"
  "deploy/vps/.env"
)

GITHUB_SECRETS=(
  "RAILWAY_TOKEN"
  "VERCEL_TOKEN"
  "VPS_HOST"
  "VPS_USERNAME"
  "VPS_SSH_KEY"
  "GHCR_READ_TOKEN"
  "VPS_AUTH_SECRET"
  "VPS_CRON_SECRET"
  "VPS_POSTGRES_PASSWORD"
  "VPS_REDIS_PASSWORD"
  "VPS_DATABASE_URL"
  "VPS_REDIS_URL"
  "VPS_MASSIVE_API_KEY"
  "VPS_BINANCE_API_KEY"
  "VPS_POLYMARKET_API_KEY"
  "VPS_GOOGLE_CLIENT_ID"
  "VPS_GOOGLE_CLIENT_SECRET"
  "VPS_GITHUB_CLIENT_ID"
  "VPS_GITHUB_CLIENT_SECRET"
)

GITHUB_VARS=(
  "RAILWAY_PROJECT_ID"
  "RAILWAY_ENVIRONMENT_ID"
  "RAILWAY_WORKERS_SERVICE"
  "VERCEL_ORG_ID"
  "VERCEL_PROJECT_ID"
  "ENABLE_VPS_DEPLOY"
  "VPS_APP_DIR"
  "GHCR_USERNAME"
  "VPS_WEB_IMAGE"
  "VPS_WORKERS_IMAGE"
  "VPS_NEXT_PUBLIC_APP_URL"
  "VPS_AUTH_URL"
  "VPS_DATABASE_SSL"
  "VPS_MARKET_DATA_MODE"
  "VPS_COMPETITION_PHASE"
  "VPS_BRIEFING_WINDOW_MINUTES"
  "VPS_POSTGRES_DB"
  "VPS_POSTGRES_USER"
  "VPS_WORKER_ENABLE_SCHEDULER"
  "VPS_WORKER_APP_URL"
  "VPS_BINANCE_ENABLED"
  "VPS_BINANCE_BASE_URL"
  "VPS_MASSIVE_ENABLED"
  "VPS_MASSIVE_BASE_URL"
  "VPS_MASSIVE_SYMBOLS"
  "VPS_MASSIVE_RECENT_SYMBOL_LIMIT"
)

declare -A SECRET_SET=()
declare -A VAR_SET=()
declare -A ENV_TO_TARGET=(
  [NEXT_PUBLIC_APP_URL]="VPS_NEXT_PUBLIC_APP_URL"
  [AUTH_URL]="VPS_AUTH_URL"
  [AUTH_SECRET]="VPS_AUTH_SECRET"
  [CRON_SECRET]="VPS_CRON_SECRET"
  [DATABASE_URL]="VPS_DATABASE_URL"
  [DATABASE_SSL]="VPS_DATABASE_SSL"
  [REDIS_URL]="VPS_REDIS_URL"
  [REDIS_PASSWORD]="VPS_REDIS_PASSWORD"
  [POSTGRES_DB]="VPS_POSTGRES_DB"
  [POSTGRES_USER]="VPS_POSTGRES_USER"
  [POSTGRES_PASSWORD]="VPS_POSTGRES_PASSWORD"
  [AGENTTRADER_MARKET_DATA_MODE]="VPS_MARKET_DATA_MODE"
  [AGENTTRADER_COMPETITION_PHASE]="VPS_COMPETITION_PHASE"
  [AGENTTRADER_BRIEFING_WINDOW_MINUTES]="VPS_BRIEFING_WINDOW_MINUTES"
  [WORKER_ENABLE_SCHEDULER]="VPS_WORKER_ENABLE_SCHEDULER"
  [WORKER_APP_URL]="VPS_WORKER_APP_URL"
  [BINANCE_ENABLED]="VPS_BINANCE_ENABLED"
  [BINANCE_BASE_URL]="VPS_BINANCE_BASE_URL"
  [BINANCE_API_KEY]="VPS_BINANCE_API_KEY"
  [MASSIVE_ENABLED]="VPS_MASSIVE_ENABLED"
  [MASSIVE_API_KEY]="VPS_MASSIVE_API_KEY"
  [MASSIVE_BASE_URL]="VPS_MASSIVE_BASE_URL"
  [MASSIVE_SYMBOLS]="VPS_MASSIVE_SYMBOLS"
  [MASSIVE_RECENT_SYMBOL_LIMIT]="VPS_MASSIVE_RECENT_SYMBOL_LIMIT"
  [POLYMARKET_API_KEY]="VPS_POLYMARKET_API_KEY"
  [GOOGLE_CLIENT_ID]="VPS_GOOGLE_CLIENT_ID"
  [GOOGLE_CLIENT_SECRET]="VPS_GOOGLE_CLIENT_SECRET"
  [GITHUB_CLIENT_ID]="VPS_GITHUB_CLIENT_ID"
  [GITHUB_CLIENT_SECRET]="VPS_GITHUB_CLIENT_SECRET"
)

for name in "${GITHUB_SECRETS[@]}"; do
  SECRET_SET["$name"]=1
  TARGET_KINDS["$name"]="secret"
done

for name in "${GITHUB_VARS[@]}"; do
  VAR_SET["$name"]=1
  TARGET_KINDS["$name"]="variable"
done

usage() {
  cat <<'EOF'
Usage: scripts/sync-github-env.sh [options]

Sync local .env values into GitHub repository secrets/variables used by CI/CD.

Options:
  --env-file PATH      Load an additional env file. Can be provided multiple times.
  --repo OWNER/REPO    GitHub repository to update. Defaults to current gh repo.
  --no-run-ci          Do not trigger the CI workflow after syncing.
  --ci-ref REF         Git ref to use when triggering CI. Defaults to current branch.
  --dry-run            Print what would be updated without calling GitHub.
  --help               Show this help message.

Default env file load order:
  1. .env.github
  2. web-new/.env.local
  3. workers/.env
  4. deploy/vps/.env

Exact GitHub secret/variable names in your env files win over mapped names.
Example: VERCEL_TOKEN is synced directly, while AUTH_SECRET is mapped to VPS_AUTH_SECRET.
EOF
}

trim() {
  local value="$1"
  value="${value#${value%%[![:space:]]*}}"
  value="${value%${value##*[![:space:]]}}"
  printf '%s' "$value"
}

strip_quotes() {
  local value="$1"
  if [[ ${#value} -ge 2 ]]; then
    if [[ ${value:0:1} == '"' && ${value: -1} == '"' ]]; then
      value=${value:1:-1}
    elif [[ ${value:0:1} == "'" && ${value: -1} == "'" ]]; then
      value=${value:1:-1}
    fi
  fi
  printf '%s' "$value"
}

load_env_file() {
  local file="$1"
  local line key value

  [[ -f "$file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line=$(trim "$line")
    [[ -n "$line" ]] || continue
    [[ ${line:0:1} == '#' ]] && continue

    if [[ $line == export\ * ]]; then
      line=${line#export }
      line=$(trim "$line")
    fi

    [[ $line == *=* ]] || continue
    key=$(trim "${line%%=*}")
    value=$(trim "${line#*=}")
    value=$(strip_quotes "$value")

    [[ $key =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    ENV_VALUES["$key"]="$value"
  done < "$file"
}

set_target_value() {
  local target="$1"
  local value="$2"
  [[ -n "$value" ]] || return 0
  TARGET_VALUES["$target"]="$value"
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

require_tooling() {
  has_command gh || {
    printf 'Missing required tool: gh\n' >&2
    exit 1
  }

  gh auth status >/dev/null 2>&1 || {
    printf 'GitHub CLI is not authenticated. Run: gh auth login\n' >&2
    exit 1
  }
}

RUN_CI=true
DRY_RUN=false
REPO=""
CI_REF=""
declare -a EXTRA_FILES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      [[ $# -ge 2 ]] || {
        printf 'Missing value for --env-file\n' >&2
        exit 1
      }
      EXTRA_FILES+=("$2")
      shift 2
      ;;
    --repo)
      [[ $# -ge 2 ]] || {
        printf 'Missing value for --repo\n' >&2
        exit 1
      }
      REPO="$2"
      shift 2
      ;;
    --no-run-ci)
      RUN_CI=false
      shift
      ;;
    --ci-ref)
      [[ $# -ge 2 ]] || {
        printf 'Missing value for --ci-ref\n' >&2
        exit 1
      }
      CI_REF="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

for file in "${DEFAULT_FILES[@]}"; do
  load_env_file "$file"
done

for file in "${EXTRA_FILES[@]}"; do
  load_env_file "$file"
done

for key in "${!ENV_VALUES[@]}"; do
  if [[ -n ${SECRET_SET[$key]+x} || -n ${VAR_SET[$key]+x} ]]; then
    set_target_value "$key" "${ENV_VALUES[$key]}"
  fi
done

for key in "${!ENV_TO_TARGET[@]}"; do
  target=${ENV_TO_TARGET[$key]}
  if [[ -n ${ENV_VALUES[$key]+x} && -z ${TARGET_VALUES[$target]+x} ]]; then
    set_target_value "$target" "${ENV_VALUES[$key]}"
  fi
done

if [[ ${#TARGET_VALUES[@]} -eq 0 ]]; then
  printf 'No GitHub secrets or variables found in local env files.\n' >&2
  exit 1
fi

if [[ -z "$CI_REF" ]]; then
  CI_REF=$(git branch --show-current 2>/dev/null || true)
  CI_REF=${CI_REF:-main}
fi

if [[ "$DRY_RUN" == false ]]; then
  require_tooling
  if [[ -z "$REPO" ]]; then
    REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
  fi
fi

printf 'Prepared %s GitHub settings for sync.\n' "${#TARGET_VALUES[@]}"

secret_count=0
variable_count=0

for target in $(printf '%s\n' "${!TARGET_VALUES[@]}" | sort); do
  kind=${TARGET_KINDS[$target]:-}
  value=${TARGET_VALUES[$target]}

  if [[ "$kind" == "secret" ]]; then
    ((secret_count+=1))
  elif [[ "$kind" == "variable" ]]; then
    ((variable_count+=1))
  else
    printf 'Skipping unmapped target %s\n' "$target" >&2
    continue
  fi

  if [[ "$DRY_RUN" == true ]]; then
    printf '[dry-run] %s %s\n' "$kind" "$target"
    continue
  fi

  printf 'Updating %s %s\n' "$kind" "$target"
  if [[ "$kind" == "secret" ]]; then
    printf '%s' "$value" | gh secret set "$target" --repo "$REPO" --body -
  else
    gh variable set "$target" --repo "$REPO" --body "$value"
  fi
done

printf 'Synced %d secrets and %d variables.\n' "$secret_count" "$variable_count"

if [[ "$RUN_CI" == false ]]; then
  exit 0
fi

if [[ "$DRY_RUN" == true ]]; then
  printf '[dry-run] would trigger workflow ci.yml on ref %s\n' "$CI_REF"
  exit 0
fi

printf 'Triggering CI workflow on ref %s\n' "$CI_REF"
gh workflow run ci.yml --repo "$REPO" --ref "$CI_REF"
