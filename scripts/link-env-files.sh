#!/bin/bash
# Symlinks .env files from the main worktree into all other worktrees

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_WORKTREE="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILES=(
  "packages/web/.env"
  "packages/worker/.env"
)

# Get all worktrees except the main one
while IFS= read -r line; do
  WORKTREE_PATH=$(echo "$line" | awk '{print $1}')
  if [ "$WORKTREE_PATH" = "$MAIN_WORKTREE" ]; then
    continue
  fi

  echo "Setting up symlinks in: $WORKTREE_PATH"
  for rel_path in "${ENV_FILES[@]}"; do
    src="$MAIN_WORKTREE/$rel_path"
    dst="$WORKTREE_PATH/$rel_path"

    if [ ! -f "$src" ]; then
      echo "  WARNING: source not found: $src"
      continue
    fi

    mkdir -p "$(dirname "$dst")"

    if [ -L "$dst" ]; then
      echo "  Updating symlink: $rel_path"
      ln -sf "$src" "$dst"
    elif [ -f "$dst" ]; then
      echo "  WARNING: regular file exists at $dst, skipping (remove it manually to symlink)"
    else
      echo "  Creating symlink: $rel_path"
      ln -s "$src" "$dst"
    fi
  done
done < <(git -C "$MAIN_WORKTREE" worktree list)

echo "Done."
