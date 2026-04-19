---
title: "Structural blame"
legend: "WARP"
cycle: "WARP_structural-blame"
source_backlog: "docs/method/backlog/up-next/WARP_structural-blame.md"
---

# Structural blame

Source backlog item: `docs/method/backlog/up-next/WARP_structural-blame.md`
Legend: WARP

## Hill

An agent or human can point at any symbol in the codebase and
instantly see its structural lifecycle: who created it, who last
changed its signature, how many times it's been modified, and how
many other files depend on it. This replaces `git blame` (which
answers "who wrote this line") with a higher-level question: "who
shaped this abstraction?"

This slice is complete when:

- `graft blame <symbol>` returns the creation commit, last signature
  change, full change history, and reference count
- the tool works for functions, classes, methods, interfaces, types,
  and exports
- ambiguous symbol names (same name in multiple files) are handled
  explicitly — either narrowed by `--path` or reported as ambiguous
- the output is useful to both humans (formatted) and agents (JSON)
- WARP-unindexed repos get an honest "not indexed" result, not a
  crash or empty output

## Playback Questions

### Human

- [ ] Can I blame a function and see who created it and who last
      changed its signature?
- [ ] If two files have a function with the same name, does blame
      tell me it's ambiguous and ask me to narrow with --path?
- [ ] Does blame show me how many other files reference this symbol?

### Agent

- [ ] Does graft_blame return a structured result with creation
      commit, last signature change, change history, and reference
      count?
- [ ] Does graft_blame handle symbols that exist in multiple files
      (ambiguity)?
- [ ] Does graft_blame return an explicit "not indexed" result when
      WARP has no data for the requested symbol?
- [ ] Does graft_blame work for class methods (qualified names like
      `ClassName.methodName`)?
- [ ] Is the operation layer free of WARP imports (hex boundary)?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - One symbol, one lifecycle story
  - Most important fact first (current signature), then history
- Non-visual or alternate-reading expectations:
  - CLI output must be readable without color
  - JSON output must be parseable without visual formatting

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - Dates in ISO 8601
  - Author names from git, not localized
- Logical direction / layout assumptions:
  - History ordered newest-first (most recent change at top)

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - Whether the result comes from WARP index or is unavailable
  - The exact commit SHA for each lifecycle event
  - The change kind (added, signature_changed, removed)
- What must be attributable, evidenced, or governed:
  - Reference count must state the search method (ripgrep vs WARP)
  - Ambiguity must be reported, not silently resolved

## Non-goals

- [ ] Blame at the line level (that's `git blame`)
- [ ] Show the full source code of the symbol (that's `code_show`)
- [ ] Track renames across files (that's identity continuity, a
      separate WARP feature)
- [ ] Work without WARP indexing (blame requires structural history)

## Acceptance Criteria

1. `graft_blame` MCP tool returns `StructuralBlameResult` with:
   - `symbol`, `filePath`, `currentSignature`, `kind`, `exported`
   - `created` with `sha`, `author`, `date`, `message`
   - `lastSignatureChange` with same fields + `previousSignature`
   - `changeCount` (total times modified)
   - `referenceCount` and `referencingFiles`
   - `history` array of all changes
2. CLI `graft blame <symbol>` renders a readable summary
3. `--path` narrows to a specific file when symbol name is ambiguous
4. Unindexed symbols return explicit status, not crash
5. Class methods work via qualified names
6. Operation layer has zero WARP imports
