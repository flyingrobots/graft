---
title: "Bounded subprocess policy for tests and scripts"
feature: core
kind: debt
legend: TEST
lane: v0.8.0
priority: 7
effort: S
requirements:
  - "Review every spawnSync/execSync call in tests and scripts"
  - "Document exceptions where an unbounded subprocess is intentional"
acceptance_criteria:
  - "All test-suite child processes have explicit timeout handling"
  - "Script subprocess probes that can touch external daemons have bounded waits"
  - "A regression check or lint rule catches new unbounded subprocess calls in test files"
---

# Bounded subprocess policy for tests and scripts

The Docker autostart feedback exposed two related hazards: daemon probes
can hang when external sockets are unhealthy, and tests that spawn child
Node processes can stall the entire suite if the child never exits.

This pass fixed the immediate Docker probe and library test child
processes, but the repo should have a general policy for bounded
subprocesses in tests and operational scripts.

## Implementation path

1. Audit `spawnSync`, `execSync`, and direct child-process helpers under
   `test/`, `tests/`, and `scripts/`.
2. Add explicit timeout values for all test child processes.
3. For operational scripts, document any intentionally unbounded call
   and prefer bounded probes for external systems.
4. Add a focused regression check that flags new unbounded subprocesses
   in test files.
