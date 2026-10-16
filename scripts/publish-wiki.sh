#!/usr/bin/env bash
# Publish docs/*.md to the GitHub Wiki of this repository.
#
# Requires GitHub Wiki enabled on the repo. Private repos need Pro/Team;
# Free only gets Wiki on public repos. Until then, use docs/ in-repo.
#
# Requires: gh auth (or WIKI_REPO with token), git.
set -euo pipefail

if command -v gh >/dev/null 2>&1 && [[ -z "${WIKI_REPO:-}" ]]; then
  ROOT_EARLY="$(cd "$(dirname "$0")/.." && pwd)"
  if git -C "$ROOT_EARLY" remote get-url origin >/dev/null 2>&1; then
    OWNER_REPO_EARLY="$(git -C "$ROOT_EARLY" remote get-url origin | sed -E 's#(git@github\.com:|https://github\.com/)##; s#\.git$##')"
    HAS_WIKI="$(gh api "repos/${OWNER_REPO_EARLY}" --jq .has_wiki 2>/dev/null || echo false)"
    if [[ "$HAS_WIKI" != "true" ]]; then
      echo "error: GitHub Wiki is disabled on ${OWNER_REPO_EARLY} (has_wiki=false)." >&2
      echo "Private + Free cannot use Wiki. Keep docs/ in the repo, or upgrade to Pro and enable Wiki in Settings." >&2
      exit 1
    fi
  fi
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS="$ROOT/docs"

if [[ ! -d "$DOCS" ]]; then
  echo "error: docs/ not found at $DOCS" >&2
  exit 1
fi

REMOTE_URL="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
if [[ -z "${WIKI_REPO:-}" ]]; then
  if [[ -z "$REMOTE_URL" ]]; then
    echo "error: no origin remote; set WIKI_REPO=https://github.com/OWNER/REPO.wiki.git" >&2
    exit 1
  fi
  # Normalize to https://github.com/OWNER/REPO.wiki.git
  OWNER_REPO="$(echo "$REMOTE_URL" | sed -E 's#(git@github\.com:|https://github\.com/)##; s#\.git$##')"
  WIKI_REPO="https://github.com/${OWNER_REPO}.wiki.git"
fi

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

# Never echo credentials if WIKI_REPO embeds a token.
SAFE_WIKI_REPO="$(echo "$WIKI_REPO" | sed -E 's#://[^/@]*@#://***@#')"
echo "Publishing $DOCS → $SAFE_WIKI_REPO"
if ! git clone --depth 1 "$WIKI_REPO" "$TMP/wiki" 2>/dev/null; then
  mkdir -p "$TMP/wiki"
  git -C "$TMP/wiki" init -b master
  git -C "$TMP/wiki" remote add origin "$WIKI_REPO"
fi

# Wiki uses flat pages; copy markdown (and sidebar)
find "$TMP/wiki" -maxdepth 1 -type f -name '*.md' -delete
cp "$DOCS"/*.md "$TMP/wiki/"

git -C "$TMP/wiki" add -A
if git -C "$TMP/wiki" diff --cached --quiet; then
  echo "Wiki already up to date."
  exit 0
fi

git -C "$TMP/wiki" \
  -c user.name="${GIT_AUTHOR_NAME:-parche-bot}" \
  -c user.email="${GIT_AUTHOR_EMAIL:-parche-bot@users.noreply.github.com}" \
  commit -m "docs(wiki): sync from docs/"

git -C "$TMP/wiki" push -u origin HEAD:master
echo "Wiki published."
