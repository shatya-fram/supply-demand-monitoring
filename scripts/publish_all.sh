#!/usr/bin/env bash
# Publishes the COMMITTED HEAD to both public GitHub Pages sites and VERIFIES each deploy before reporting success.
#   scripts/publish_all.sh              both sites (render check first)
#   scripts/publish_all.sh --sd-only    Supply & Demand only      scripts/publish_all.sh --portal-only   landing page (portal) only
#   scripts/publish_all.sh --check      only report the live state (no push)
#   SKIP_CHECK=1 skips node scripts/render_check.js;  INNER_HTML=<file> overrides the report-01 source of the portal.
# Why: the 265 MB Pages deploy sometimes hangs at "syncing_files" and times out; re-running the same artifact keeps failing, a NEW commit (empty) builds a new
# artifact and works. This script waits for the run of the pushed commit, retries with an empty commit (max 3), then checks version.json on the live site.
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
SD=shatya-fram/supply-demand-monitoring; PT=shatya-fram/inner-jakarta-portal
SD_URL=https://shatya-fram.github.io/supply-demand-monitoring; PT_URL=https://shatya-fram.github.io/inner-jakarta-portal
INNER_HTML="${INNER_HTML:-$ROOT/../Inner Jakarta Focus Priority/Inner Jakarta Complete App (offline).html}"
MODE=all; CHECK=0
for a in "$@"; do case "$a" in --sd-only) MODE=sd;; --portal-only) MODE=portal;; --check) CHECK=1;; esac; done
SHA="$(git rev-parse --short HEAD)"
say() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
gh_retry() { local i out; for i in 1 2 3 4 5 6; do out="$("$@" 2>/dev/null)" && { printf '%s' "$out"; return 0; }; sleep 10; done; return 1; }   # api.github.com drops now and then

# run_state <repo> <headSha-prefix> -> "status conclusion" of the newest run of that commit
run_state() { gh_retry gh run list --repo "$1" --limit 8 --json status,conclusion,headSha --jq "[.[]|select(.headSha|startswith(\"$2\"))][0]|(.status // \"none\")+\" \"+(.conclusion // \"\")"; }

wait_run() {   # wait_run <repo> <full-sha> <max-seconds> -> 0 success, 1 failure / timeout
  local repo="$1" sha="$2" max="$3" t=0 st
  while [ "$t" -lt "$max" ]; do
    st="$(run_state "$repo" "$sha")"
    case "$st" in "completed success") return 0;; completed*) return 1;; esac
    sleep 15; t=$((t + 15))
  done
  return 1
}

live_sd_ok() {   # version.json of the live site must carry the published short sha
  local i v; for i in 1 2 3 4 5 6; do v="$(curl -fsS "$SD_URL/version.json?t=$(date +%s)" 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("commit",""))' 2>/dev/null)"; [ "$v" = "$SHA" ] && return 0; sleep 10; done; say "live version.json = '${v:-none}', expected $SHA"; return 1
}

publish_sd() {
  [ "$CHECK" = 1 ] && { say "SD live: $(curl -fsS "$SD_URL/version.json?t=$(date +%s)" 2>/dev/null || echo 'no version.json')"; return 0; }
  python3 scripts/prepare_public_release.py HEAD 2>&1 | grep -i "OK:\|error" || { say "prepare_public_release failed"; return 1; }
  local W; W="$(mktemp -d)"
  git clone -q --depth 1 "https://github.com/$SD.git" "$W/r" || { say "clone failed"; return 1; }
  ( cd "$W/r" && git rm -rq . && rsync -a "$ROOT/dist-public/" ./ --exclude .git && git add -A && { git commit -q -m "Publish $SHA

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" || git commit -q --allow-empty -m "Publish $SHA (no content change)"; } && git push -q origin main ) || { say "push failed"; return 1; }
  local tries=0 full
  while : ; do
    full="$(cd "$W/r" && git rev-parse HEAD)"; say "SD pushed ${full:0:7}, waiting for the Pages deploy (max 8 min)"
    if wait_run "$SD" "$full" 480; then break; fi
    tries=$((tries + 1)); [ "$tries" -gt 3 ] && { say "SD deploy FAILED after $tries empty-commit retries (see: gh run list --repo $SD)"; return 1; }
    say "deploy failed or timed out; a rerun of the same artifact keeps failing, pushing an EMPTY commit for a fresh artifact (retry $tries/3)"
    ( cd "$W/r" && git commit -q --allow-empty -m "Redeploy Pages (retry $tries, deploy timed out)" && git push -q origin main ) || return 1
  done
  live_sd_ok && say "SD OK: live version.json = $SHA" || return 1
}

publish_portal() {
  [ "$CHECK" = 1 ] && { say "portal live: $(curl -fsS "$PT_URL/config.json?t=$(date +%s)" 2>/dev/null)"; return 0; }
  [ -f "$INNER_HTML" ] || { say "report 01 source not found: $INNER_HTML (set INNER_HTML)"; return 1; }
  local before T; before="$(curl -fsS "$PT_URL/config.json?t=$(date +%s)" 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("cb",""))' 2>/dev/null)"
  T="$(mktemp -d)"; git archive HEAD | tar -x -C "$T"; cp portal/users.json portal/_keys.json "$T/portal/" || { say "portal/users.json or _keys.json missing"; return 1; }
  ( cd "$T" && python3 scripts/build_offline_html.py --portal >/dev/null && cd portal && INNER_HTML="$INNER_HTML" bash publish.sh "$PT" ) | tail -1 || return 1
  local i after full; full="$(gh_retry gh api "repos/$PT/commits/main" --jq .sha)"
  say "portal pushed ${full:0:7}, waiting for its Pages build"
  for i in $(seq 1 24); do
    [ "$(run_state "$PT" "$full")" = "completed success" ] && break; sleep 15
  done
  for i in 1 2 3 4 5 6; do after="$(curl -fsS "$PT_URL/config.json?t=$(date +%s)" 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("cb",""))' 2>/dev/null)"; [ -n "$after" ] && [ "$after" != "$before" ] && { say "portal OK: config cb $before -> $after"; return 0; }; sleep 10; done
  say "portal NOT verified: config.json cb unchanged ($before)"; return 1
}

if [ "$CHECK" = 0 ] && [ -z "${SKIP_CHECK:-}" ]; then say "render_check (SKIP_CHECK=1 to skip)"; node scripts/render_check.js >/tmp/publish_render_check.log 2>&1 || { tail -5 /tmp/publish_render_check.log; say "render_check FAILED: nothing published"; exit 1; }; fi
[ "$CHECK" = 0 ] && say "publishing committed HEAD $SHA (uncommitted work of other sessions is not included)"
RC=0
[ "$MODE" != portal ] && { publish_sd || RC=1; }
[ "$MODE" != sd ] && { publish_portal || RC=1; }
[ "$RC" = 0 ] && say "DONE: everything verified" || say "NOT DONE: see the lines above"
exit "$RC"
