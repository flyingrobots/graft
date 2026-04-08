# live reference search fallback

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
