---
title: "Read-only daemon inspector, slice 1"
cycle: "SURFACE_read-only-daemon-inspector"
design_doc: "docs/design/SURFACE_read-only-daemon-inspector.md"
outcome: hill-met
drift_check: yes
---

# Read-only daemon inspector Retro

## Outcome

`graft daemon inspect` and the public `inspectDaemon` client obtain one bounded
observation through a dedicated GET on the existing private local transport.
The operator can inspect session/opened-workspace/active-route relationships,
scheduled jobs, parent-held worker assignments, repository monitor records,
loaded process identity, and the limits of retained index evidence. The route
does not create an MCP workload session or initiate workload activity.

Implementation: `38437450` on `cycle/daemon-inspector`, based on `e1d34c18`.
The design was committed first at `7a67b9d5`. This local Retro precedes PR
creation; merge, release, installation, and a running-daemon restart are separate
steps and have not happened in this cycle.

## Playback and falsification

The seven approved gates are mapped to inspectable tests in
[validation.md](witness/validation.md). The key experiment holds an actual
scheduled A-worktree request at worker admission, opens B in the same MCP
session, then inspects the A-routed job. The query also preserves attribution
when deterministic projections remove the originating session.

Repeated real-socket inspection of a controlled daemon compares every exported
application field, allows capture identity/time to change, and installs traps
on actual workload entry points: transport registration/activity, binding,
execution-context capture, cache access/mutation, graph open, Git/filesystem
work, and scheduling. This provides evidence about hidden effects beyond
filesystem diffs. It is scoped to the current passive projections and those
entry points, not a universal proof about future adapters.

Four temporary production mutations were independently detected by the intended
behavioral tests: dropped job route, unavailable evidence replaced by empty,
hidden session touch, and missing terminal escaping. Every mutated source was
restored byte for byte, followed by a passing focused suite. See
[calibration.json](witness/calibration.json) and its readable failure extracts.
No mutation score or claim that every assertion was calibrated is made.

[example.txt](witness/example.txt) and [example.json](witness/example.json) are
fictional deterministic review inputs/output, using an explicit clock. They
show two sessions sharing A, one of them currently active on B, and an A-routed
job. They are not captures from an operator's daemon, golden test oracles, or
evidence of source currency. The text was inspected for relationship order,
explicit unknowns, layer-specific counts, and capture-age wording.

## Validation and findings

- Isolated full suite: **264 files / 2,092 tests passed**, 245.38 seconds.
- Final focused suite after source restoration: **5 files / 25 tests passed**.
- Public-surface release gate: **2 files / 10 tests passed**.
- Typecheck, lint, build, package dry-run, and whitespace checks passed.
- The built client returned `DAEMON_INSPECTION_UNSUPPORTED` against the existing
  older daemon. There was no MCP fallback, daemon upgrade, or restart.

The first isolated run had two failures: an immutable ESM export could not be
spied on in a transport test, and a new direct `node:path` import violated the
repository boundary rule. The test now uses an ESM module mock; socket path
resolution delegates to the existing daemon composition boundary. A local
rebind integration run also exceeded the generic five-second test timeout while
running real Git/HTTP/parser-child work. Its schedule remains explicitly gated;
the medium integration now has a declared 20-second resource ceiling. A
diagnostic run completed in 1.75 seconds. These failures were investigated and
recorded, not retried into an unchanged green result.

A pressure case with 10,000 nested records exposed costly validation before
cardinality rejection. A cheap bounded preflight now rejects the inventory
before per-record validation. A separate valid-cardinality response exceeds the
byte cap and is refused without emitting partial JSON. These are distinct
record-count and byte-limit tests.

## Drift and retained limits

The query copies parent-owned memory synchronously on the daemon event loop;
it can observe an asynchronous workflow between its transitions. It does not
establish simultaneous child-process or filesystem state. Worker-to-scheduler
job correlation, scheduler eligibility reasons, historical workspace touches,
per-workspace storage/residency, index entry counts, coverage, and source
validation are not invented. The current service assessment is explicitly
unsupported because no new capability-health rule is introduced.

Exact filters precede output limits, but the shared scan budget can still make
an inventory incomplete. Workers, pool keys, and lifetime counters stay visibly
daemon-wide. Repository-owned monitors do not acquire a fabricated worktree
scope from a session/workspace selector. No complete-empty claim escapes a
failed or incomplete prerequisite.

The public surface registry explicitly distinguishes this API/CLI operator
query from the existing composed MCP status reader. `daemon status` and its
`ok | degraded` contract remain unchanged.

## Follow-on work

The existing parent card
`docs/method/backlog/cool-ideas/SURFACE_daemon-observability-api-and-bijou-dashboard.md`
retains the larger program. This cycle links the focused child and does not
close the parent. Slice 2 remains read-only Bijou navigation, stable selection,
bounded polling/backoff, and pause/freeze/disconnection display. Slice 3 remains
bounded retained activity and scheduler-owned explanations. Coverage measurement,
browser targets, dashboard artifacts, target maps/receipts, tracing, durable
history, and control commands remain outside this delivery.

No additional bad-code or cool-ideas cards were introduced. Missing projections
are explicit supported outcomes of this scope, not silently accepted defects.
The proposed repository-wide Testing Standards were discussed but not adopted
as binding policy inside this feature cycle.
