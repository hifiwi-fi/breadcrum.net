#!/bin/bash
# Link one root .env from the main worktree, preserving every existing target.
set -euo pipefail

MAIN_WORKTREE=""
# Porcelain's NUL-delimited paths also support spaces and newlines in worktree names.
while IFS= read -r -d '' record; do
  case "$record" in
    'worktree '*) WORKTREE_PATH=${record#worktree } ;;
    *) continue ;;
  esac
  if [ -z "$MAIN_WORKTREE" ]; then
    MAIN_WORKTREE=$WORKTREE_PATH
    continue
  fi

  src="$MAIN_WORKTREE/.env"
  dst="$WORKTREE_PATH/.env"
  if [ -e "$dst" ] || [ -L "$dst" ]; then
    echo "Preserving existing .env file or symlink in: $WORKTREE_PATH"
  elif [ -f "$src" ]; then
    ln -s "$src" "$dst"
    echo "Linked root .env in: $WORKTREE_PATH"
  else
    echo "No root .env in the main worktree; reconcile legacy env files manually."
  fi
done < <(git --no-pager worktree list --porcelain -z)

echo "Done."
