#!/usr/bin/env sh
set -eu

# Run from the repository root; optional arguments are forwarded to fly deploy.
if [ "${1:-}" = "--" ]; then
  shift
fi

: "${SENTRY_ORG:=breadcrum}"
: "${SENTRY_API_PROJECT:=breadcrum}"
: "${SENTRY_WORKER_PROJECT:=bc-worker}"
: "${SENTRY_ENVIRONMENT:=production}"

if [ -z "${SENTRY_RELEASE:-}" ]; then
  SENTRY_RELEASE="breadcrum@$(git --no-pager rev-parse HEAD)"
fi

short_sha=$(git --no-pager rev-parse --short HEAD)
if [ -z "${SENTRY_DEPLOY_NAME:-}" ]; then
  git_ref=${GITHUB_REF_NAME:-}
  if [ -z "${git_ref}" ]; then
    git_ref=$(git --no-pager symbolic-ref --quiet --short HEAD 2>/dev/null || true)
  fi
  if [ -z "${git_ref}" ]; then
    git_ref=$(git --no-pager describe --exact-match --tags HEAD 2>/dev/null || true)
  fi
  if [ -n "${git_ref}" ]; then
    SENTRY_DEPLOY_NAME="breadcrum:${git_ref}@${short_sha}"
  else
    SENTRY_DEPLOY_NAME="breadcrum@${short_sha}"
  fi
fi

export SENTRY_ORG SENTRY_RELEASE SENTRY_DEPLOY_NAME

if command -v flyctl >/dev/null 2>&1; then
  flyctl=flyctl
elif command -v fly >/dev/null 2>&1; then
  flyctl=fly
else
  echo "flyctl or fly is required to deploy." >&2
  exit 1
fi

if ! pnpm exec sentry-cli info --no-defaults --quiet >/dev/null; then
  echo "Sentry CLI is not authenticated. Run 'pnpm exec sentry-cli login' locally or set SENTRY_AUTH_TOKEN in CI." >&2
  exit 1
fi

# Repeating 'new' updates an existing release, including its project membership.
echo "Preparing shared Sentry release ${SENTRY_RELEASE} for ${SENTRY_API_PROJECT} and ${SENTRY_WORKER_PROJECT}"
pnpm exec sentry-cli releases new "${SENTRY_RELEASE}" \
  --org "${SENTRY_ORG}" --project "${SENTRY_API_PROJECT}" --project "${SENTRY_WORKER_PROJECT}"
pnpm exec sentry-cli releases set-commits "${SENTRY_RELEASE}" \
  --org "${SENTRY_ORG}" --project "${SENTRY_API_PROJECT}" --project "${SENTRY_WORKER_PROJECT}" \
  --auto --ignore-missing

# Only the public browser DSN belongs in the image, never server DSNs or auth tokens.
if [ -n "${SENTRY_BROWSER_DSN:-}" ]; then
  set -- --build-arg "SENTRY_BROWSER_DSN=${SENTRY_BROWSER_DSN}" "$@"
fi

"${flyctl}" deploy \
  --config fly.toml \
  --dockerfile Dockerfile \
  --build-arg "SENTRY_RELEASE=${SENTRY_RELEASE}" \
  "$@"

# Do not finalize or record a deployment if Fly failed.
pnpm exec sentry-cli releases finalize "${SENTRY_RELEASE}" \
  --org "${SENTRY_ORG}" --project "${SENTRY_API_PROJECT}" --project "${SENTRY_WORKER_PROJECT}"
pnpm exec sentry-cli releases deploys "${SENTRY_RELEASE}" new \
  --org "${SENTRY_ORG}" --project "${SENTRY_API_PROJECT}" --project "${SENTRY_WORKER_PROJECT}" \
  --env "${SENTRY_ENVIRONMENT}" --name "${SENTRY_DEPLOY_NAME}"
