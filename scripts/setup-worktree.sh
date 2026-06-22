#!/bin/bash
# Called by the Zed create_worktree hook to initialize a new worktree.
# Symlinks .env files from the main worktree, copies ignored local data,
# and runs pnpm install.
#
# Expected env vars (provided by Zed):
#   ZED_WORKTREE_ROOT       — path to the newly created worktree
#   ZED_MAIN_GIT_WORKTREE   — path to the main (original) worktree

set -euo pipefail

ENV_FILES=(
  "packages/web/.env"
  "packages/worker/.env"
)

COPY_DIRS=(
  "packages/web/data/geoip"
)

echo "Setting up worktree: $ZED_WORKTREE_ROOT"

for rel_path in "${ENV_FILES[@]}"; do
  src="$ZED_MAIN_GIT_WORKTREE/$rel_path"
  dst="$ZED_WORKTREE_ROOT/$rel_path"

  if [ ! -f "$src" ]; then
    echo "  WARNING: source not found: $src"
    continue
  fi

  mkdir -p "$(dirname "$dst")"

  if [ -L "$dst" ]; then
    echo "  Updating symlink: $rel_path"
    ln -sf "$src" "$dst"
  elif [ -f "$dst" ]; then
    echo "  WARNING: regular file exists at $dst, skipping"
  else
    echo "  Creating symlink: $rel_path"
    ln -s "$src" "$dst"
  fi
done

for rel_path in "${COPY_DIRS[@]}"; do
  src="$ZED_MAIN_GIT_WORKTREE/$rel_path"
  dst="$ZED_WORKTREE_ROOT/$rel_path"

  if [ ! -d "$src" ]; then
    echo "  WARNING: source directory not found: $src"
    continue
  fi

  mkdir -p "$dst"

  echo "  Copying directory: $rel_path"
  cp -R "$src/." "$dst/"
done

echo "Running pnpm install..."
cd "$ZED_WORKTREE_ROOT"
pnpm install

echo "Done."
