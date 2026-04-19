---
title: "release gate for three-surface capability posture"
legend: "CORE"
cycle: "CORE_release-gate-for-three-surface-capability-posture"
source_backlog: "docs/method/backlog/up-next/CORE_release-gate-for-three-surface-capability-posture.md"
---

# release gate for three-surface capability posture

Source backlog item: `docs/method/backlog/up-next/CORE_release-gate-for-three-surface-capability-posture.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

Releases fail fast when the capability registry, the documented
three-surface capability matrix, and the public API/release posture
drift out of sync.

## Playback Questions

### Human

- [ ] Can a targeted release gate prove the documented three-surface
      capability matrix still matches the capability registry baseline
      and row set?
- [ ] Does release guidance explicitly require the three-surface
      posture gate before another version ships?

### Agent

- [ ] Does the release gate keep the public API contract and
      three-surface matrix in the same review loop instead of treating
      API drift as incidental?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: the release gate should
  fail on one small targeted suite instead of forcing contributors to
  infer posture drift from unrelated release validation noise.
- Non-visual or alternate-reading expectations: the gate must remain
  text-first and inspectable through tests and docs, not hidden in an
  opaque release script.

## Localization and Directionality

- Locale / wording / formatting assumptions: release-gate docs and
  tests assume English markdown and command names.
- Logical direction / layout assumptions: none.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: capability rows,
  baseline counts, and the presence of the release-gate command must be
  derivable from repo truth.
- What must be attributable, evidenced, or governed: the release
  doctrine, runbook, and invariant must all name the same gate instead
  of leaving API review implicit.

## Non-goals

- [ ] Solving scheduler, hook, or WARP roadmap work.
- [ ] Generating release notes automatically.
- [ ] Making every capability exist on every surface.

## Backlog Context

Extend release review beyond CLI/MCP peer checks so releases verify the intended API/CLI/MCP capability posture. The gate should catch undocumented one-surface drift, missing baseline witnesses, and stale capability metadata before another release ships.
