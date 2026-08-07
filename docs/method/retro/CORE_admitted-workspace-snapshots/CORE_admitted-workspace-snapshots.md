---
title: "Admitted workspace snapshots"
cycle: "CORE_admitted-workspace-snapshots"
design_doc: "docs/design/CORE_admitted-workspace-snapshots.md"
outcome: hill-met
drift_check: yes
---

# Admitted workspace snapshots Retro

## Summary

This cycle made the admitted-snapshot seam tell the truth before production
settlement decoding is built on it. Snapshot construction now enforces the
declared aperture, aggregate byte budget, and symlink refusal. A live
filesystem source is no longer substitutable for a view carrying admitted
evidence. Every bounded `RepoWorkspace` analysis method uses one normalized
read view, while the legacy `fs` constructor/member remains available only for
public compatibility. The operations evaluate policy and project results from
one physical observation while preserving the difference between authority
refusal, absence, and invalid UTF-8.

The whole #228 hill is not met. Both production composition roots still use
`LiveWorkspaceReadSource`; Graft has no `ObserveWorkspaceSnapshot` Edict
source, settlement decoder, restart recovery, or zero-reread replay path. The
cycle closes the internal semantic and authority seam only, so the issue must
remain open.

## Playback Witness

- [verification.md](./witness/verification.md)
- The design packet's human and agent playback questions now carry explicit
  answers rather than relying on checked boxes alone.

## Drift

- The scope expanded after call-path inspection found that MCP `read_range`
  and `file_outline` bypassed the workspace read policy and that `code_show`
  re-read content it already held. All three now use the single authority.
- The first UTF-8 repair exposed an ordering defect: policy could be skipped
  when decoding failed. Policy now evaluates every observation before an
  invalid-text projection is reported.
- Merging current `origin/main` changed only the generated backlog dependency
  artifacts. They were regenerated through their owning script; no manual
  generated-byte resolution was retained.
- Third-party review found eight behavioral or contract gaps and four test or
  maintainability gaps after publication. The repairs preserve non-absence
  read errors, hide retained bytes, preserve BOM identity, classify refusal
  metrics, reject unusable budgets, enforce observation-size schemas, and add
  stable snapshot-admission error codes. All findings were repaired in
  separate commits and revalidated as one integrated head.
- A final current-head Codex pass found three additional boundary defects: the
  documented `RepoWorkspace({ fs })` constructor had broken, snapshot
  descriptors remained runtime-mutable, and expanded outline output still
  advertised schema v1. Each received its own RED/GREEN repair before the
  closure gate was rerun.
- The next exact-head Codex pass found six more defects: the public `fs` member
  was still absent, invalid UTF-8 metrics were misclassified, split outline
  schemas diverged, refused ranges overstated their runtime footprint, the
  witness named a nonexistent commit, and snapshot read exceptions lacked the
  codes the design promised. Each received a focused repair and the integrated
  gate was rerun on `ac0e3287`.
- A self-audit then found stale authority prose left behind by the compatibility
  repair. Commit `51ec7be7` corrected the code comments, design, Retro, and
  witness without changing behavior. One apparent duplicate type-union member
  was checked against both the reviewed and current heads, proved to be a
  duplicated terminal excerpt, and transparently withdrawn without code churn.

## What surprised you?

The most consequential defects were outside the original snapshot
constructor. The type seam could have been internally sound while primary
adapter paths still bypassed it, and three bounded read operations had two
different invalid-UTF-8 laws. The call graph and error-precedence order needed
the same scrutiny as the new types.

## What would you do differently?

Start the next observation cycle with a complete inventory of composition
roots, direct filesystem reads, and error-precedence decisions before writing
the first decoder test. Mutation checks against the budget boundary,
aperture totality, type non-substitutability, and policy-before-decoding order
were especially effective and should remain part of that cycle.

## New Debt

- [Duplicate bounded-read implementations](../../backlog/bad-code/CLEAN_duplicate-bounded-read-implementations.md)
- [Evidence-grade naming overclaims](../../backlog/bad-code/CLEAN_evidence-grade-naming-overclaims.md)
- [Decorative safe-read intent](../../backlog/bad-code/CLEAN_safe-read-intent-is-decorative.md)

## Cool Ideas

- None recorded.

## Follow-up Items

- Resolve the first-basis protocol in Echo/Edict: propose-and-admit versus an
  explicit unknown-basis observation family.
- After that decision, open a new Graft cycle for the Graft-owned Edict source,
  settlement decoder, request-before-effect composition, restart recovery, and
  settlement-backed replay.
- Keep #228 open until the whole-feature acceptance list in the design packet
  is executable and green.

## Backlog Maintenance

- [x] Every defect deferred by this cycle has a bad-code card or an explicit
      cross-repository follow-up above.
- [x] Closed upstream conditions were rechecked; hello-echo#10 and
      hello-echo#26 are both closed.
- [x] No dead work was silently marked complete.
