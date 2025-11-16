#!/usr/bin/env bash
set -euo pipefail

# Simple helper to create a branch, push and open a PR using gh (GitHub CLI).
# Usage:
#   scripts/create-pr.sh <branch-name-or-empty> "PR title" "PR body"
# If branch name is empty, a branch named feature/<timestamp> will be created.

BRANCH="$1"
TITLE="${2:-}" 
BODY="${3:-}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install from https://cli.github.com/ or use manual push + GitHub UI to create PR." >&2
  exit 1
fi

if [ -z "$BRANCH" ]; then
  TS=$(date +%Y%m%d%H%M%S)
  BRANCH="feature/$TS"
fi

echo "Creating and switching to branch: $BRANCH"
git switch -c "$BRANCH"

echo "Remember to stage and commit your changes before running this script."
if [ -z "$(git status --porcelain)" ]; then
  echo "No changes detected (working tree clean). If you already committed, continuing..."
else
  echo "Uncommitted changes detected. Please commit before creating a PR."
  git status --porcelain
  exit 1
fi

echo "Pushing branch to origin..."
git push -u origin "$BRANCH"

echo "Creating PR via gh..."
if [ -z "$TITLE" ]; then
  # Try to auto-fill using last commit message
  TITLE=$(git log -1 --pretty=%B | head -n1)
fi

gh pr create --base main --head "$BRANCH" --title "$TITLE" --body "$BODY"

echo "PR created for branch $BRANCH"
