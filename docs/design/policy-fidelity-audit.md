---
title: "Cycle 0030 — Policy Fidelity Audit"
---

# Cycle 0030 — Policy Fidelity Audit

**Hill:** Produce a factual audit of policy enforcement across MCP,
hooks, and CLI, align doctrine with the current truth, and split the
real enforcement gaps into specific follow-on work.

## Why now

The repo already says policy fidelity must be unified before Graft is
ready for general system-wide use. That is the right bar, but the
current implementation does not yet satisfy it.

The problem is not that policy does nothing. The problem is that policy
is fragmented:

- hooks load `.graftignore`, MCP does not
- some MCP tools use server middleware, some evaluate policy manually,
  and some do no policy work at all
- some surfaces pass session depth and budget, some pass only session
  depth, and some pass neither
- refusal shapes vary by surface, and one path (`code_find`) can
  silently drop refused matches instead of surfacing a refusal

This cycle is an audit cycle, not a fake "fix all policy" cycle. The
goal is to replace ambiguity with a matrix and a concrete queue.

## Sponsor users

- The coding agent using Graft MCP tools and expecting the same banned
  file to be handled the same way everywhere.
- The operator relying on hook behavior and assuming MCP parity.
- The maintainer making readiness claims in `docs/BEARING.md`.

## Playback questions

1. Can we point to one matrix that says, for every relevant surface,
   where policy is evaluated, which options are passed, and what shape
   a refusal takes?
2. Can we say exactly where `.graftignore` is enforced today and where
   it is still missing?
3. Can we distinguish "no policy needed here" from "policy drift" for
   CLI commands and non-read tools?
4. Can we break the remaining work into a few specific backlog items
   instead of one vague "fix policy fidelity" blob?

## Scope

In scope:

- every MCP tool
- Claude Read hooks
- every current CLI command
- session depth, budget, bans, and `.graftignore`
- working-tree reads and historical/git-backed reads
- refusal-shape drift when the same file is denied by different entry
  points

Out of scope:

- landing full parity in code
- designing the future CLI bounded-read surface
- watcher/control-plane work

## Deliverables

- a factual policy matrix in `policy-matrix.md`
- doctrine alignment in `docs/invariants/policy-total.md`
- focused follow-on backlog items for the missing enforcement slices
- a retro that closes the audit honestly as a docs/design cycle

## Findings

1. `safe_read` totality is real, but broad surface fidelity is not.
   `safe_read` does call `evaluatePolicy()` on first reads and re-checks
   policy on cache-hit and stale-cache branches, but that does not mean
   all read surfaces are equivalent.

2. Hooks are the only current surface that loads `.graftignore`.
   `handleReadHook()` and `handlePostReadHook()` both pass
   `graftignorePatterns`, while current MCP paths pass only session
   depth and/or budget.

3. MCP policy is split across three patterns:
   - server middleware via `policyCheck: true`
   - per-tool manual evaluation
   - no policy evaluation at all

4. Structural tools are the biggest gap on `main`.
   `file_outline`, `graft_map`, `graft_diff`, and `graft_since` read
   repo content without policy evaluation today.

5. `code_find` has a behavior gap, not just an input gap.
   Project-wide searches can silently drop refused matches after
   `evaluatePrecisionPolicy()` instead of surfacing a refusal result.

6. `run_capture` is currently an ungoverned shell-output surface.
   That may be acceptable as an explicit escape hatch, but the contract
   is not written down anywhere yet.

7. CLI has no governed bounded-read peer yet.
   `graft init` scaffolds files and `graft index` ingests git history,
   but neither is a policy-equivalent peer to MCP bounded-read tools.

## Decision

Close this cycle as an audit packet once the matrix, doctrine fix, and
follow-on backlog slices are written. Do not pretend that parity was
landed here.

Direction locked in during cycle close:

- missing `.graftignore` enforcement on any bounded-read entry point is
  a bug
- bounded-read entry points should converge on the same policy contract
  rather than each choosing their own subset of policy inputs
