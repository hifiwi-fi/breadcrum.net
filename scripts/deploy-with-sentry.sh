#!/usr/bin/env sh
set -eu

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <fly-config> <dockerfile> [fly deploy args...]" >&2
  exit 2
fi

fly_config=$1
dockerfile=$2
shift 2

if [ "${1:-}" = "--" ]; then
  shift
fi

: "${SENTRY_ORG:=breadcrum}"
: "${SENTRY_ENVIRONMENT:=production}"

fly_app=$(sed -n 's/^app = "\(.*\)"/\1/p' "${fly_config}" | head -n 1)
if [ -z "${SENTRY_PROJECT:-}" ]; then
  case "${fly_app}" in
    breadcrum)
      SENTRY_PROJECT=breadcrum
      ;;
    bc-worker | yt-dlp-api)
      SENTRY_PROJECT=${fly_app}
      ;;
    *)
      echo "Set SENTRY_PROJECT or add a mapping for Fly app '${fly_app}'." >&2
      exit 1
      ;;
  esac
fi

if [ -z "${SENTRY_RELEASE:-}" ]; then
  SENTRY_RELEASE="${SENTRY_PROJECT}@$(git rev-parse HEAD)"
fi

short_sha=$(git rev-parse --short HEAD)
if [ -z "${SENTRY_DEPLOY_NAME:-}" ]; then
  git_ref=${GITHUB_REF_NAME:-}

  if [ -z "${git_ref}" ]; then
    git_ref=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)
  fi

  if [ -z "${git_ref}" ]; then
    git_ref=$(git describe --exact-match --tags HEAD 2>/dev/null || true)
  fi

  if [ -n "${git_ref}" ]; then
    SENTRY_DEPLOY_NAME="${SENTRY_PROJECT}:${git_ref}@${short_sha}"
  else
    SENTRY_DEPLOY_NAME="${SENTRY_PROJECT}@${short_sha}"
  fi
fi

export SENTRY_ORG
export SENTRY_PROJECT
export SENTRY_RELEASE
export SENTRY_DEPLOY_NAME

fly_config_dir=$(dirname "${fly_config}")
if [ -z "${SENTRY_BROWSER_DSN:-}" ] && [ -f "${fly_config_dir}/.env" ]; then
  SENTRY_BROWSER_DSN=$(sed -n 's/^SENTRY_BROWSER_DSN=//p' "${fly_config_dir}/.env" | tail -n 1)
fi

if ! command -v flyctl >/dev/null 2>&1; then
  if command -v fly >/dev/null 2>&1; then
    flyctl=fly
  else
    echo "flyctl or fly is required to deploy." >&2
    exit 1
  fi
else
  flyctl=flyctl
fi

if ! pnpm exec sentry-cli info --no-defaults --quiet >/dev/null; then
  echo "Sentry CLI is not authenticated. Run 'pnpm exec sentry-cli login' locally or set SENTRY_AUTH_TOKEN in CI." >&2
  exit 1
fi

echo "Preparing Sentry release ${SENTRY_RELEASE} for ${SENTRY_ORG}/${SENTRY_PROJECT}"
if pnpm exec sentry-cli releases info "${SENTRY_RELEASE}" --org "${SENTRY_ORG}" --project "${SENTRY_PROJECT}" --quiet >/dev/null 2>&1; then
  echo "Sentry release already exists."
else
  pnpm exec sentry-cli releases new "${SENTRY_RELEASE}" --org "${SENTRY_ORG}" --project "${SENTRY_PROJECT}"
fi

pnpm exec sentry-cli releases set-commits "${SENTRY_RELEASE}" --org "${SENTRY_ORG}" --project "${SENTRY_PROJECT}" --auto --ignore-missing

if [ -n "${SENTRY_BROWSER_DSN:-}" ]; then
  set -- --build-arg "SENTRY_BROWSER_DSN=${SENTRY_BROWSER_DSN}" "$@"
fi

"${flyctl}" deploy \
  --config "${fly_config}" \
  --dockerfile "${dockerfile}" \
  --build-arg "SENTRY_RELEASE=${SENTRY_RELEASE}" \
  "$@"

pnpm exec sentry-cli releases finalize "${SENTRY_RELEASE}" --org "${SENTRY_ORG}" --project "${SENTRY_PROJECT}"
pnpm exec sentry-cli releases deploys "${SENTRY_RELEASE}" new --org "${SENTRY_ORG}" --project "${SENTRY_PROJECT}" --env "${SENTRY_ENVIRONMENT}" --name "${SENTRY_DEPLOY_NAME}"
