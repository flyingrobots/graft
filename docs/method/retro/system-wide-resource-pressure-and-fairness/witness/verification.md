---
title: "0058 verification"
---

# 0058 verification

## Focused witness

```bash
pnpm exec vitest run \
  test/unit/mcp/daemon-job-scheduler.test.ts \
  test/unit/adapters/node-git.test.ts \
  test/unit/operations/safe-read.test.ts \
  test/unit/mcp/daemon-worker-pool.test.ts \
  test/unit/mcp/persistent-monitor.test.ts \
  test/unit/warp/writer-id.test.ts \
  tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts
```

Result:
- `7` files passed
- `40` tests passed

## Drift witness

```bash
method_drift 0058-system-wide-resource-pressure-and-fairness
```

Result:
- `No playback-question drift found.`
- `Scanned 1 active cycle, 8 playback questions, 8 test descriptions.`

## Cycle reading

The focused witness reflects the actual shipped substrate:
- unrelated interactive jobs can run concurrently under default daemon
  scheduler capacity
- scheduler state is explicit about session, repo, priority, kind, and
  writer lanes
- `nodeGit` is async and works through the `GitClient` seam
- bounded read operations use async filesystem reads on request paths
- worker jobs preserve session snapshots and return deltas instead of
  mutating daemon state directly
- monitors and foreground repo work share the daemon scheduler counters
