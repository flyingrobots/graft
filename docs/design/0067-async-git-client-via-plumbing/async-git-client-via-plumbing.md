---
title: "Async Git client via plumbing"
legend: "CORE"
cycle: "0067-async-git-client-via-plumbing"
source_backlog: "docs/method/backlog/up-next/CORE_async-git-client-via-plumbing.md"
---

# Async Git client via plumbing

Source backlog item: `docs/method/backlog/up-next/CORE_async-git-client-via-plumbing.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

The core Git seam used by MCP and repo-state flows runs through the
async `GitClient` port backed by `@git-stunts/plumbing`, not synchronous
shell git execution. Workspace resolution and diff/history helpers use
that seam directly, and this cycle closes by making that repo truth
explicit and witnessed.

## Playback Questions

### Human

- [ ] workspace resolution resolves repo and worktree identity through the async GitClient seam

### Agent

- [ ] git diff helpers use the async GitClient seam for changed files and file-at-ref lookup

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: the Git execution contract
  is a single async port instead of scattered shell calls in MCP flows.
- Non-visual or alternate-reading expectations: playback evidence uses
  direct assertions against returned values rather than terminal output
  inspection.

## Localization and Directionality

- Locale / wording / formatting assumptions: command strings and git ref
  names remain repo-local technical tokens.
- Logical direction / layout assumptions: repo and worktree paths remain
  normalized absolute filesystem paths.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: MCP-adjacent Git
  flows should depend on `GitClient.run(...)`, not hidden synchronous
  shell calls.
- What must be attributable, evidenced, or governed: the cycle should be
  witnessed through playback tests that exercise workspace resolution
  and diff/history helpers against the async seam.

## Non-goals

- [ ] Rewriting CLI bootstrap helpers in `src/cli/init.ts`.
- [ ] Changing the general-purpose `ProcessRunner` port or `code_refs`
  shell execution path.
- [ ] Scheduler and worker-pool policy changes.

## Backlog Context

Replace the synchronous `GitClient` execution path with an async
adapter backed by `@git-stunts/plumbing`.

Why:
- daemon-mode Git work still routes through `spawnSync`
- one slow Git command can block unrelated daemon sessions
- Graft already depends on `@git-stunts/plumbing` for WARP open, so the
  substrate is present but underused

Scope:
- make `GitClient` async
- replace `src/adapters/node-git.ts` with a plumbing-backed adapter
- migrate repo-state, workspace binding, monitor runtime, structural
  diff helpers, and precision helpers onto the async seam
- keep runtime truth explicit when Git exits non-zero

Non-goals:
- worker-pool scheduling
- filesystem port migration
- changing WARP writer identity policy

Related:
- `docs/design/0058-system-wide-resource-pressure-and-fairness/system-wide-resource-pressure-and-fairness.md`
- `docs/method/backlog/up-next/SURFACE_daemon-job-scheduler-and-worker-pool.md`

Effort: M
