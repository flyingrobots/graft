---
title: Daemon session liveness for repo concurrency
legend: CORE
lane: graveyard
---

# Daemon session liveness for repo concurrency

## Disposition

Implemented on branch `next` in commit `9b76d80` (`fix(mcp): ignore stale daemon sessions in repo concurrency`). The backlog note should not keep surfacing as open ASAP work now that repo concurrency filters stale daemon sessions and reports daemon session liveness diagnostics.

## Original Proposal

Evidence on 2026-04-11:

- `src/mcp/daemon-control-plane.ts` records `startedAt` and `lastActivityAt` for each registered daemon session and updates `lastActivityAt` via `touchSession()` on each handled request.
- `src/mcp/daemon-server.ts` calls `touchSession()` before request handling and only unregisters sessions on transport close/error or daemon shutdown.
- `src/mcp/repo-concurrency.ts` merges daemon live sessions into concurrency posture by filtering bound sessions only; it does not apply any idle cutoff based on `lastActivityAt`.

Consequence:

A crashed or abandoned client session can keep the current worktree in `shared_worktree` posture even when there is only one actual active operator.

Desired direction:

Use `lastActivityAt` as a liveness signal. Either:

1. Apply an idle timeout when deriving `liveRepoSessions`, or
2. Add an explicit heartbeat/lease model and treat expired sessions as inactive.

Acceptance shape:

- Old daemon sessions stop affecting repo concurrency after a bounded idle window.
- Long-lived active sessions stay live through normal tool traffic or explicit heartbeat.
- Surface should make stale-vs-live reasoning inspectable in status output so operators can understand why a worktree is marked shared.
