---
title: "Bijou local history stays stale after branch transition"
feature: warp
kind: bad-code
legend: WARP
lane: bad-code
priority: 1
effort: M
status: open
reported: 2026-05-26
example_repo: "/Users/james/git/bijou"
---

# Bijou local history stays stale after branch transition

## Problem

Graft's repo-local causal and structural-history surfaces can present stale or
incorrect state after a target repository has moved through a PR merge,
fast-forward, checkout, and branch rename sequence.

The concrete witness is the Bijou repo at `/Users/james/git/bijou`.

On 2026-05-26, Git reported Bijou was clean on
`cycle/dx-035-input-action-system` at `247f1e95`, equal to both `main` and
`origin/main`. That merge commit includes PR #117, whose local commit
`4372170c` added `packages/bijou-tui/src/input-map.ts` and the AppFrame
double-Tab footer toggle.

Graft, however, still surfaced older local-history truth:

- `state_load` returned a DF-071 checkpoint from
  `cycle/df-071-dogfood-block-authored-surfaces`, saying that three DF-071
  commits remained.
- `graft_log` did not expose PR #117 or the `input-map.ts` structural addition;
  a path-scoped log for `packages/bijou-tui/src/input-map.ts` reported no
  structural changes in the recent commit window.
- `causal_status` reported an active `rebase_phase` even though Git had no
  active rebase metadata and `git status` was clean.
- `graft_diff main..HEAD` and `graft_since 247f1e95..HEAD` correctly reported
  an empty current-branch diff, so ref-view truth and local-history truth were
  disagreeing.

This is a recovery hazard. An agent trying to resume work could believe an
old cycle is still active, miss the most recent shipped commit, or stop because
Graft says a rebase is in progress.

## Snapshot

Captured from `/Users/james/git/bijou` on 2026-05-26.

Git current state:

```text
$ git status --short --branch
## cycle/dx-035-input-action-system

$ git rev-parse --short HEAD main origin/main
247f1e95
247f1e95
247f1e95
```

Recent Git movement:

```text
247f1e95 HEAD@{2026-05-25 13:52:06 -0700}: Branch: renamed refs/heads/cycle/df-073-dialog-theme-backgrounds to refs/heads/cycle/dx-035-input-action-system
247f1e95 HEAD@{2026-05-25 13:50:58 -0700}: Branch: renamed refs/heads/cycle/dx-035-input-action-system to refs/heads/cycle/df-073-dialog-theme-backgrounds
247f1e95 HEAD@{2026-05-25 13:48:57 -0700}: checkout: moving from main to cycle/dx-035-input-action-system
247f1e95 HEAD@{2026-05-25 13:48:57 -0700}: pull --ff-only origin main: Fast-forward
097a59fc HEAD@{2026-05-25 13:48:55 -0700}: checkout: moving from cycle/df-072-dogfood-block-preview-polish to main
4372170c HEAD@{2026-05-25 11:12:34 -0700}: commit: feat(tui): add semantic input gestures for footer toggle
9d4d42f6 HEAD@{2026-05-25 08:17:21 -0700}: commit: fix(dogfood): flatten standard block previews
```

PR #117 structural witness from Git:

```text
$ git show --name-status --oneline 4372170c -- \
  packages/bijou-tui/src/input-map.ts \
  packages/bijou-tui/src/input-map.test.ts \
  packages/bijou-tui/src/app-frame.ts \
  docs/CHANGELOG.md

4372170c feat(tui): add semantic input gestures for footer toggle
M       docs/CHANGELOG.md
M       packages/bijou-tui/src/app-frame.ts
A       packages/bijou-tui/src/input-map.test.ts
A       packages/bijou-tui/src/input-map.ts
```

No Git rebase state exists:

```text
$ test -d .git/rebase-merge; echo rebase_merge=$?
rebase_merge=1
$ test -d .git/rebase-apply; echo rebase_apply=$?
rebase_apply=1
$ find .git -maxdepth 2 \( -name rebase-merge -o -name rebase-apply -o -name MERGE_HEAD -o -name CHERRY_PICK_HEAD \) -print
# no output
```

Graft observations from the same repo-local MCP session:

```text
state_load.content:
Bijou DF-071 branch checkpoint: cwd /Users/james/git/bijou, branch
cycle/df-071-dogfood-block-authored-surfaces, clean worktree after 12 commits
over origin/main. ... Need 3 more commits to reach 15 slices ...

causal_status.semanticTransition:
kind: rebase_phase
summary: Rebase started and is now inspectable as active repo state.

graft_diff(base: "main", head: "HEAD"):
files: []

graft_since(base: "247f1e95", head: "HEAD"):
summary: +0 added, -0 removed, ~0 changed across 0 files

graft_log(path: "packages/bijou-tui/src/input-map.ts"):
recent entries reported "No structural changes" and did not include
4372170c or merge commit 247f1e95.
```

The raw local-history artifacts are still available in the example repo:

- `/Users/james/git/bijou/.graft/state.md`
- `/Users/james/git/bijou/.graft/logs/mcp-runtime.ndjson`
- `/Users/james/git/bijou/.graft/local-history/continuity:932eca833966d22f.json`

## Risk

Graft is specifically used during context recovery. If recovery surfaces mix
current ref truth with stale local-history truth, agents will make bad branch,
cycle, and safety decisions.

The false rebase signal is especially risky in repositories that prohibit
rebases. A user or agent may stop work unnecessarily, or worse, try to "fix" a
nonexistent rebase state.

## Desired Outcome

Graft should make current Git authority and persisted local-history authority
agree, or loudly mark the persisted side stale.

The minimum acceptable behavior is:

- `state_load` includes the branch, HEAD, and timestamp of the saved state and
  labels it stale when the current repo branch or HEAD differs.
- `causal_status` only reports an active rebase when Git metadata such as
  `rebase-merge` or `rebase-apply` exists.
- `graft_log` and path-scoped structural history either include recent commits
  after PR merge/branch transitions or report that the structural index is
  stale relative to current Git HEAD.
- Ref-view tools such as `graft_diff` and local-history tools do not silently
  disagree without an explicit diagnostic.

## Acceptance Criteria

- Add a regression fixture based on the Bijou snapshot above or an equivalent
  minimal repo-local history fixture.
- A branch rename after a fast-forwarded merge does not leave `state_load`
  looking authoritative for an older branch.
- A clean repository with no rebase metadata cannot produce
  `semanticTransition.kind = "rebase_phase"`.
- Path-scoped `graft_log` can see a recently added TypeScript file after a PR
  merge, or it emits a machine-readable stale-index reason.
- `causal_status.nextAction` does not instruct the caller to continue a rebase
  unless Git confirms one is active.
- The diagnostic includes enough evidence for an agent to prefer Git current
  state over stale local-history state when they conflict.
