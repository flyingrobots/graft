---
title: "Graft structural-history Echo package descriptor"
cycle: "CORE_graft-structural-history-echo-package-descriptor"
design_doc: "docs/design/CORE_graft-structural-history-echo-package-descriptor.md"
outcome: hill-met
drift_check: yes
---

# Graft structural-history Echo package descriptor Retro

## Summary

The slice shipped as PR #65 and landed on `main` in merge commit
`75aa83a0c4ff4481b6be56ab52e1dcf3667ef651`.

Graft now carries a deterministic structural-history Echo package descriptor at
`schemas/graft-structural-history.echo-package.json`. The descriptor records the
package identity, schema identity, Wesley-generated TypeScript artifact identity,
Wesley generator identity, descriptor-only Echo posture, and the record,
evidence, and operation names Graft expects Echo to host later.

The slice remained Graft-only. It did not change Echo, install an Echo package,
invoke Echo runtime storage or replay, or change Wesley semantics.

## Playback Witness

Artifacts under
`docs/method/retro/CORE_graft-structural-history-echo-package-descriptor/witness`.

## Drift Check

`method_drift` reported no playback-question drift:

```text
No playback-question drift found.
Scanned 1 active cycle, 0 playback questions, 306 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.
```

## What surprised you?

The Method MCP close tool timed out after 120 seconds and produced no local
retro files. The closure had to be written manually from merged PR, CI, and drift
evidence.

## What would you do differently?

Keep the slice shape. The descriptor-only boundary was the right cut: it made
Graft's future Echo package contract inspectable without prematurely expanding
Echo.

For process, the Method close timeout should become explicit bad-code backlog
work so future cycles do not rely on manual recovery when closure automation
stalls.

## Follow-up items

- Filed `CLEAN_method-close-timeout-produces-no-retro-artifact`.
