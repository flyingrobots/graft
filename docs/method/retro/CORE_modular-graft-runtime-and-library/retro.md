---
title: "Modular Graft design and memory investigation retro"
cycle: CORE_modular-graft-runtime-and-library
design_doc: docs/design/CORE_modular-graft-runtime-and-library.md
outcome: design-delivered-runtime-unmodified
drift_check: yes
---

# Modular Graft design and memory investigation retro

## Delivered scope

The operator requested a comprehensive architecture packet reconsidering whether
CLI and daemon need separate packages, then reported more than 7 GB attributed
to Graft. The cycle investigated the live process posture and continued the
requested design with explicit memory ownership and containment obligations.

The recommendation is `@flyingrobots/graft-lib` plus the existing
`@flyingrobots/graft` operator package, with CLI, daemon and MCP as internal
modules. An optional `@flyingrobots/graft-tui` follows when its independent
interactive surface is delivered. Published members use lockstep versions.
No manifests, runtime code, package exports, installed versions, or daemon
processes were changed.

The packet maps all 346 files in the declared tracked source/build manifest and
all 55 declared capabilities, with 17 rendered Mermaid diagrams. It includes
class, entity-relationship, sequence, state and dependency diagrams; current
versus target ownership; compatibility; publication; migration slices; and
acceptance/falsification requirements.

## Playback and validation

See [verification.md](verification.md) for commands, diagram source digests,
source scope, runtime observations, and limits. `pnpm lint` passed. All 17 final
Mermaid sources rendered with Mermaid CLI 11.12.0; the entity diagram was also
visually inspected. Local relative-link targets were checked as authoring QA.
This is not a new repository test suite or a runtime regression claim.

Runtime RED/GREEN, typecheck and full isolated runtime suites were not required
for this documentation-only change. The design explicitly assigns those gates
to implementation slices. The tiny installed-pool experiment demonstrated
retention semantics using fake handles; it did not reproduce a 7 GB allocation.

## Findings and debt

The following cards record source-supported gaps; their existence is not proof
that any one caused the missing large process:

- [Graph residency](../../backlog/bad-code/CORE_graph-residency-has-no-release-budget.md)
- [Session observation retention](../../backlog/bad-code/CORE_session-observation-retention-needs-bounds.md)
- [Queue admission](../../backlog/bad-code/CORE_daemon-queue-admission-needs-byte-limits.md)
- [Worker resource/restart budgets](../../backlog/bad-code/CORE_worker-memory-and-crash-loop-budget.md)
- [Partial startup cleanup](../../backlog/bad-code/CORE_daemon-partial-startup-resource-cleanup.md)

Existing PR #251 owns graph-lease implementation and PR #250 owns session reaping.
Both were verified open and absent from the pinned main baseline. The cards and
design link those deliveries instead of proposing competing implementations.
No PR review gate was declared satisfied and neither branch was modified.
No additional cool-idea card was filed; optional TUI/inspector extensions already
have a separate observability backlog and explicit deferrals in the packet.

## Drift and corrections

The first five-package suggestion treated package names as a proxy for module
boundaries. Re-examining the actual consumer and operator lifecycle led to the
smaller installation model. The source inventory remains explicit about mixed
files that require real extraction, particularly `server.ts`, invocation,
workspace routing, and adapter output contracts.

The initial Think MCP mailbox read failed with `missing required trailer
eg-patch-oid`. CLI queries eventually recovered Claude's actual jedit message
using `claude-think --recent --count=5 --query=graft` in the jedit directory.
Claude reported an unused direct MCP SDK declaration and that removing it alone
did not remove the Graft-supplied dependency tree. That peer report is labeled
separately from Graft source observations. The temporary socket mailbox and
Think are both pull-based coordination here; neither gives a demonstrated agent
wake-up guarantee. No new product messaging infrastructure was added.

## Remaining boundary

The more-than-7-GB process was absent before inspection, with no captured
pre-exit PID/start identity or heap profile. The incident is not diagnosed or
fixed. The next runtime work is reconciliation of the existing lease/reaper
reviews and a controlled memory/admission measurement slice, independent of
monorepo packaging. Publishing this documentation does not authorize merging
those PRs, restarting the installed daemon, or cutting a release.
