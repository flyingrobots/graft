---
title: "live reference search fallback"
---

# live reference search fallback

Source backlog item: `docs/method/backlog/up-next/CORE_live-reference-search-fallback.md`
Legend: CORE

## Sponsors

- Human: repo operator
- Agent: Codex

## Hill

When someone is deciding what a change will break, Graft should answer
reference and caller questions even before full structural dependency
tracing exists. The first shipped answer should be explicit text
fallback, not a fake semantic result.

## Playback Questions

### Human

1. Can I ask for import sites, callsites, or property access patterns
   without dropping straight to raw `grep`?
2. Does the tool tell me exactly which fallback pattern and scope it
   used so I can judge how approximate the answer is?

### Agent

1. Is the fallback provenance explicit in the output contract instead of
   being implied by behavior?
2. Does the first version stay honest about being text fallback rather
   than pretending to be exact dependency tracing?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: return flat match records
  with path, line, column, and preview rather than nested diagnostics
- Non-visual or alternate-reading expectations: keep fallback
  provenance, mode, and scope explicit in the payload

## Localization and Directionality

- Locale / wording / formatting assumptions: tool wording stays code and
  path oriented; no locale-dependent formatting
- Logical direction / layout assumptions: left-to-right path and code
  preview assumptions only

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: requested mode,
  fallback engine, search pattern, and scope
- What must be attributable, evidenced, or governed: whether the answer
  is approximate text fallback and whether policy filtering removed
  matches

## Non-goals

- [ ] exact semantic dependency tracing
- [ ] historical reference search across git refs
- [ ] replacing `code_find` symbol search behavior

## Backlog Context

Refactoring feedback from 2026-04-08 says Graft is useful for
understanding structure, but still fails the blast-radius phase of
real refactors.

Concrete misses:
- `code_find("surface.cells")` returned no matches because it only
  searches symbol names, not usage sites
- there is no way to ask for every import site of `createSurface`
- there is no way to ask for every callsite of `applyMaskInPlace`
- there is no way to map property access patterns like `.cells`
  across a workspace
- the fallback was raw `grep`, which answered the question faster
  than Graft could

Hill:
- Graft should have a near-term answer for reference and caller
  questions before full structural dependency tracing is complete
- when precise structural resolution is unavailable, the product
  should degrade explicitly to a scoped grep/ripgrep fallback rather
  than returning zero matches

Scope:
- design a `code_refs` / `code_callers` surface or an explicit mode on
  `code_find`
- support import-site, callsite, and property-access queries
- support workspace-aware scoping across package boundaries
- make fallback provenance explicit: structural match vs text fallback,
  plus the pattern and scope used

Non-goals:
- pretending text grep results are exact semantic references
- waiting for full WARP dependency edges before shipping a useful
  first version

Why now:
- the feedback called this the biggest missing feature for
  refactoring workflows
- without this, Graft helps with orientation but not with deciding
  what a change will break

See also:
- `docs/method/backlog/cool-ideas/WARP_symbol-reference-tracing.md`
- `docs/method/backlog/cool-ideas/WARP_structural-impact-prediction.md`

Effort: M
