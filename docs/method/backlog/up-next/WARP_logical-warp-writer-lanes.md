---
title: "Logical WARP writer lanes"
legend: WARP
lane: up-next
---

# Logical WARP writer lanes

Requeued after being pulled active too early. This work depends on the scheduler and monitor execution model becoming real first, so writer-lane identity maps to actual logical job classes instead of hypothetical ones.

Keep behind:
- 0068 daemon-job-scheduler-and-worker-pool
- 0070 monitors-run-through-scheduler

Original active packet: `docs/design/0072-logical-writer-lanes/logical-writer-lanes.md`
