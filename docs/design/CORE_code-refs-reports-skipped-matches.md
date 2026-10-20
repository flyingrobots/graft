---
title: "code_refs reports what it skipped"
legend: "CORE"
cycle: "CORE_code-refs-reports-skipped-matches"
source_backlog: "ROADMAP.md (branch claude/roadmap-echo), item A3"
---

# code_refs reports what it skipped

Roadmap item: A3 on branch `claude/roadmap-echo`. There is no backlog card yet.
Legend: CORE

## Hill

A `code_refs` answer says what it left out. When the search matched lines in
files that policy refuses, or in files that could not be loaded, the answer
counts those files and matches by reason instead of dropping them silently.
`total` stays the number of visible matches, and `skipped` accounts for the
rest.

## Evidence

- `src/mcp/tools/code-refs.ts` loads each matched file and evaluates the
  precision policy. A match in a file that fails to load is dropped with
  `continue`. A match in a refused file is dropped too; only the first refusal
  is remembered.
- That refusal is reported only when no match survives. If any match is
  visible, the response reports `total` and nothing about the dropped ones.
  An agent cannot tell "three callers" from "three visible callers and two in
  `.graftignore`d files".
- `provenance.filesSearched` counts the files passed to the search engine,
  including the ones whose matches were later dropped.

## Design

Every `code_refs` response, the visible-match answer and the all-refused
refusal alike, carries:

```json
"skipped": {
  "files": 1,
  "matches": 2,
  "reasons": [{ "reason": "GRAFTIGNORE", "files": 1, "matches": 2 }]
}
```

- `reason` is the policy refusal reason (`GRAFTIGNORE`, `SECRET`, `BINARY`,
  ...), or `UNREADABLE` when the matched file could not be loaded.
- `reasons` is sorted by `reason`, so the answer is deterministic.
- `files` and `matches` are the sums over `reasons`.
- An answer that skipped nothing says so explicitly with zero counts and an
  empty `reasons`, rather than omitting the field.

Skipped files are counted, not named. A refused path is something policy
withholds; the all-refused refusal already names its first path, unchanged.

## Playback Questions

### Agent

- [ ] With one visible match and two matches in a `.graftignore`d file, does
      the answer report `total: 1` and two skipped matches in one file, with
      reason `GRAFTIGNORE`?
- [ ] When a matched file disappears before it is loaded, is its match
      counted under `UNREADABLE`?
- [ ] When every match is refused, does the refusal state the skipped counts?
- [ ] When nothing was skipped, does the answer say so?

### Human

- [ ] Can I tell from one response whether `total` is the whole answer?

## Non-goals

- [ ] Search engine failures. `rg` or `grep` exiting with an error still
      fails the call; partial engine output is a separate change.
- [ ] Naming skipped paths, which would disclose what policy withholds.
- [ ] A shared terms block across readings. That is roadmap item A5, which
      builds on this field and the completeness work in A4.

## Acceptance Criteria

1. A fixture with one visible match and a refused file reports `total: 1` and
   `skipped` with the refused file's matches under its reason.
2. A match whose file cannot be loaded is counted under `UNREADABLE`.
3. The all-refused refusal carries `skipped` with every refused file.
4. An answer with nothing skipped reports zero counts.
5. The MCP and CLI output schemas accept the field.

## Test Strategy

RED: four cases in `test/unit/mcp/code-refs.test.ts` call the real tool
through an in-repo server. The unreadable case wraps the real process runner
and adds one match line, in the format of whichever engine answers (the test
image has no ripgrep, so grep answers there), for a path that does not exist.
That is how a file removed between search and load presents. All four fail on `main`
because the response has no `skipped` field.

GREEN: tally skipped files and matches by reason in the handler and add the
field to both output schema definitions.

Validation: `test/unit/mcp/code-refs.test.ts` and
`test/unit/contracts/output-schemas.test.ts` in the isolated runner,
`pnpm typecheck`, `pnpm lint`, `git diff --check`.
