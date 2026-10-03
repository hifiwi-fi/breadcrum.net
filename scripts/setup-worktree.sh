#!/bin/bash
# Called by Zed's create_worktree hook; never replace local files or symlinks.
# Zed supplies ZED_WORKTREE_ROOT and ZED_MAIN_GIT_WORKTREE.
set -euo pipefail

: "${ZED_WORKTREE_ROOT:?Zed must supply the new worktree path}"
: "${ZED_MAIN_GIT_WORKTREE:?Zed must supply the main worktree path}"

echo "Setting up worktree: $ZED_WORKTREE_ROOT"
src="$ZED_MAIN_GIT_WORKTREE/.env"
dst="$ZED_WORKTREE_ROOT/.env"
if [ -e "$dst" ] || [ -L "$dst" ]; then
  echo "  Preserving existing .env file or symlink"
elif [ -f "$src" ]; then
  ln -s "$src" "$dst"
  echo "  Linked root .env"
else
  echo "  No root .env in the main worktree; reconcile legacy env files manually."
fi

src="$ZED_MAIN_GIT_WORKTREE/data/geoip"
dst="$ZED_WORKTREE_ROOT/data/geoip"
if [ -e "$dst" ] || [ -L "$dst" ]; then
  echo "  Preserving existing GeoIP data"
elif [ -d "$src" ]; then
  mkdir -p "$(dirname "$dst")"
  cp -R "$src" "$dst"
  echo "  Copied GeoIP data"
else
  echo "  No GeoIP data in the main worktree; lookups will be unavailable until downloaded."
fi

cd "$ZED_WORKTREE_ROOT"
pnpm install --frozen-lockfile
echo "Done."
