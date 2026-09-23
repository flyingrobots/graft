---
title: "Make heap plateau a test, not a hope"
feature: warp
kind: cool-idea
legend: WARP
lane: cool-ideas
priority: 3
effort: M
status: open
reported: 2026-09-23
owner: flyingrobots
---

# Make heap plateau a test, not a hope

## The idea

The daemon memory leak was four separate causes, each individually plausible
to miss, and all four were found only after a 16 GB machine OOMed. The unit
tests that now cover them assert *mechanisms* — a resident is evicted, a
parser is reused, registers are pruned. None of them assert the property
anyone actually cares about: **retained heap stops growing**.

Those are different claims. Every mechanism test can pass while a fifth,
unknown ratchet keeps the daemon climbing. The property is what should be
gated.

A soak that indexes the same file N times, forces collection, samples
`process.memoryUsage().heapUsed` at intervals, and asserts the later half
shows no upward trend would catch a regression in any of the four causes and
any future fifth one, without naming them.

The shape that makes this work rather than flake:

- compare *slopes across windows*, not absolute bytes — absolute numbers vary
  by machine, Node version, and GC timing
- run enough generations that one GC cycle cannot mask the trend
- assert "not growing", with a stated tolerance, rather than a byte budget —
  `WARP_resident-count-is-not-a-memory-budget` is explicit that a count limit
  must not become an RSS promise, and the same discipline applies here
- keep it out of the default suite; it is a scheduled or opt-in gate

The interesting part is that this measures the thing the incident was about.
The existing tests prove the four known ratchets are closed. This proves the
daemon is flat — which is the actual acceptance criterion in the design
packet, and currently the only one verified by hand.

## Related

- `docs/design/WARP_daemon-memory-leak.md` acceptance criterion 7
- `docs/method/backlog/bad-code/WARP_resident-count-is-not-a-memory-budget.md`
