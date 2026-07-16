---
title: "Codex feedback: build the agent's working set"
date: "2026-07-14"
author: "Codex"
external_source: "/Users/james/git/blog/Graft/feedback/codex-agent-native-campaigns.md"
external_source_sha256: "d7be1d945730630abbe466b014b6c52121956becaae6d66ee4277aa5a5d86354"
inspected_graft_commit: "5b9c4a866c9938e31cd159c0639ee9dedbaed1ea"
---

# Codex feedback: build the agent's working set

## Witness purpose

This document preserves the campaign-driving facts from a long-running Codex
session in a location that travels with Graft. The original feedback remains in
the blog checkout named in frontmatter and is pinned by SHA-256. This is a
bounded evidence witness, not a verbatim duplicate of the 645-line source.

The session involved issue planning, worktrees, RED/GREEN implementation,
GitHub review, CI, merges, cross-session handoffs, and coordination across
Edict, Echo, and Wesley. It inspected Graft at `5b9c4a86` on
`cycle/real-echo-structural-history-provider`.

## What worked

- `safe_read -> outline -> read_range` was the right agent protocol.
- An 11,713-byte, 243-line README became a 3,450-byte structural outline with a
  useful jump table; the targeted range returned in about 210 ms.
- One-call `workspace_open` had already removed the earlier multi-call daemon
  onboarding ramp.
- Explicit `cwd` routing was the right basis for authorized multi-repo work.
- Versioned schemas, reason codes, bounded reads, and projection metadata were
  valuable and should be preserved.
- Symbol-oriented history remained Graft's most differentiated capability.

## Measured control-plane friction

| Call | Useful subject | Returned response |
| :--- | ---: | ---: |
| `safe_read` of a 666-byte file | 666 bytes | 1,696 bytes |
| `doctor` | routine health summary | 11,093 bytes |
| `activity_view(limit: 12)` | 12 bounded events | 17,292 bytes |
| `workspace_status` | a handful of identifiers | 1,179 bytes |

Cold structural queries also interrupted the agent loop:

| Operation | Observed latency |
| :--- | ---: |
| First `workspace_open` for Graft | about 4.5 s |
| `code_find("*receipt*")` | about 16.3 s |
| `code_find("*state*")` | about 8.3 s |
| `code_show(buildReceiptResult)` | about 4.3 s |
| `read_range` | about 0.2 s |

The exact timings are observations, not deterministic test thresholds.

## Confirmed truth defects

- A first observation of 253 pre-existing untracked paths was described as
  “Bulk transition movement” even though Graft had no earlier observation from
  which to establish movement.
- Attribution remained unknown until a separate actor attachment.
- Historical session multiplicity could be presented as shared-worktree
  concurrency even when no live overlapping actor footprint was visible.
- `activity_view` explicitly disclosed that write events were not captured.

## Recommended product direction

Make Graft the agent's evidence-linked campaign control plane while keeping
every default response small, fast, deterministic, and progressively
discoverable.

The source recommended this delivery order:

1. Compact receipt policy with full receipt retrieval.
2. Summary-first `doctor` and `activity_view`.
3. Readiness and phase timing for potentially slow calls.
4. Correct baseline-versus-transition semantics.
5. Explicit actor bootstrap and live-concurrency semantics.
6. Structured checkpoint/resume.
7. Durable job handles.
8. Multi-repo campaign and evidence projections.
9. Write-event coverage and typed GitHub projections.
10. Capability discovery and transactional governed patches.

## Product-boundary routing

Repository direction narrows that proposal:

- Graft owns bounded repo/worktree facts, receipts, diagnostics, observation
  truth, generic evidence references, and provider-neutral readiness.
- Method owns backlog lanes, goalposts, executable slices, blocker DAGs, retros,
  merge/release truth, and the “next executable slice” query.
- A typed GitHub/Method integration owns issue, review-thread, CI, and merge-gate
  projections.
- Echo and git-warp provider selection does not block the first control-plane
  response and truth-correctness campaign.

## Quantitative milestone targets

- Warm orientation or resume under one second as an observed product target,
  not a machine-dependent unit-test assertion.
- Default control-plane metadata below 20% of ordinary read payload, or below
  512 bytes when the domain payload is tiny.
- Default `doctor()` below 2 KiB and naming one next action.
- First observation never claiming unobserved movement.
- Live concurrency distinct from historical multi-session activity.
- Capability discovery without reading the entire MCP registry.
- List-shaped responses eventually exposing byte limits, truncation, and
  cursors through a separately designed pagination contract.

## Independent corroboration

A Claude session recorded in local-only commit `f9df3e7e` reached the same
receipt conclusion on 2026-07-10. A 465-byte file produced a 1,461-byte
response, with the receipt accounting for roughly two thirds of the payload.
That agent recommended slim per-call receipts while retaining cumulative
aggregates in `stats` or an explicit verbose/full mode. The same report said
burden accounting itself was valuable; the correction is progressive
disclosure, not removal of evidence.

This corroborating measurement is embedded here because the local commit is
not part of `origin/main` and may not be available to remote reviewers.

## First campaign pull

The first Graft campaign pulled from this witness is defined in
`docs/design/SURFACE_agent-working-set-control-plane.md`:

1. baseline observation truth;
2. compact-by-default, full-on-request receipts;
3. summary-first doctor and activity views; and
4. compact capability discovery over registered tools.

Later session lifecycle, durable operation, evidence, integration, and governed
mutation campaigns remain explicitly deferred.
