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

A `code_refs` answer says what it left out without becoming an oracle for
confidential content. When the search matched lines in files that policy
omits for relevance, or in files that could not be loaded, the answer counts
those files and matches by reason instead of dropping them silently.
Confidential files are never searched, and the answer states that rule
instead of counting them. `total` stays the number of visible matches.

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

### Two kinds of ban

Policy bans serve two purposes, and the answer treats them differently.

- **Relevance omission**: `BINARY`, `LOCKFILE`, `MINIFIED`, `BUILD_OUTPUT`
  and `GRAFTIGNORE`. The material is noise for an agent. Its content is not
  returned, but the answer may count the matches it left out. `.graftignore`
  is a relevance control, not a confidentiality control (`docs/SETUP.md`).
- **Content denial**: `SECRET`. A confidential file's content must never
  influence a response: not a match, a match count, a refusal, a size, an
  error, or a receipt byte count. The answer cannot count what it left out,
  because any count would be derived from the content.

### Confidential files are never searched

After listing candidate files and before running `rg` or `grep`, the handler
removes every confidential file from the list. Confidentiality is decided by
file name alone (`isConfidentialPath`, `src/policy/confidential.ts`), applied
independently of the order in which bans choose the displayed reason. So
`dist/.env`, which policy refuses as `BUILD_OUTPUT`, is still never searched.

A confidential file is not counted anywhere: not in `skipped`, not in
`provenance.filesSearched` (which counts only the files actually given to the
search engine), and not in a separate "not searched" count. A count of
confidential files in a path scope would disclose whether such files exist,
and Graft has no declaration that this metadata is public. The answer instead
states the rule, which is the same for every repository and query:

```json
"contentDenial": { "classification": "SECRET", "treatment": "not-searched", "countsDisclosed": false }
```

### Relevance omissions are counted

Every `code_refs` response, the visible-match answer and the all-refused
refusal alike, carries:

```json
"skipped": {
  "files": 1,
  "matches": 2,
  "reasons": [{ "reason": "GRAFTIGNORE", "files": 1, "matches": 2 }]
}
```

- `reason` is a relevance ban reason (`BINARY`, `LOCKFILE`, `MINIFIED`,
  `BUILD_OUTPUT`, `GRAFTIGNORE`) or `UNREADABLE` when the matched file could
  not be loaded. The schema does not admit `SECRET`.
- `reasons` is sorted by `reason`, so the answer is deterministic.
- `files` and `matches` are the sums over `reasons`.
- An answer that skipped nothing says so explicitly with zero counts and an
  empty `reasons`, rather than omitting the field.

Skipped files are counted, not named. The all-refused refusal names its first
relevance-refused path, as before; it can no longer name a confidential file.

### Schema version

`skipped` and `contentDenial` expand a strict output, so `graft.mcp.code_refs`
advances from `2.0.0` to `3.0.0` under
`docs/invariants/versioned-output-schemas.md`. No negotiation is introduced
and strict validation is not weakened. The test selects the validator by the
`_schema` identity the response advertises, not by tool name.

### Review rulings (2026-10-21)

An external review of this packet ruled:

- **MUST**: confidential files never reach the content search, independently
  of display-reason precedence. Implemented above.
- A query-independent count of confidential files still reveals metadata;
  report counts only if that metadata is explicitly public. Graft has no such
  declaration, so no count is reported. "The agent can already run Git" does
  not hold where Graft is the agent's only read interface.
- Non-`SECRET` does not automatically mean content disclosure is permitted.
  The relevance-omission and content-denial distinction above is explicit,
  and `docs/invariants/banned-never-leak.md` records it.
- The paired-repository witness covers visible matches, no visible matches,
  alternative ban reasons (`dist/.env` displayed as `BUILD_OUTPUT`, a
  confidential file under a `.graftignore`d directory), call mode, file
  existence, and warm caches. Only per-call receipt fields (session id, trace
  id, timestamp, latency) are removed before comparison; secret-derived sizes,
  ratios, digests and errors are compared as emitted. Finite fixtures support
  the property; they do not prove universal noninterference.
- `code_find` has the same oracle on `main` and is fixed in its own change
  (`claude/code-find-secret-prefilter`). The product-wide confidentiality
  claim stays incomplete until that lands and the remaining surfaces are
  audited (`docs/method/backlog/bad-code/CORE_confidential-content-surface-audit.md`).
- Do not ship this branch's counts while deferring the known fix: the
  prefilter lands here, with the counts.

## Playback Questions

### Agent

- [ ] With one visible match and two matches in a `.graftignore`d file, does
      the answer report `total: 1` and two skipped matches in one file, with
      reason `GRAFTIGNORE`?
- [ ] When a matched file disappears before it is loaded, is its match
      counted under `UNREADABLE`?
- [ ] When every match is refused, does the refusal state the skipped counts?
- [ ] When nothing was skipped, does the answer say so?
- [ ] Do two repositories that differ only in a confidential file's content,
      or in whether it exists, produce identical responses call for call?
- [ ] Is `dist/.env` kept out of the search although it displays as
      `BUILD_OUTPUT`?
- [ ] Does the advertised `_schema` version select the validator that
      accepts the response?

### Human

- [ ] Can I tell from one response whether `total` is the whole answer?

## Non-goals

- [ ] Search engine failures. `rg` or `grep` exiting with an error still
      fails the call; partial engine output is a separate change.
- [ ] Naming skipped paths, which would disclose what policy withholds.
- [ ] Counting confidential files. That needs an explicit declaration that
      the metadata is public, which Graft does not have.
- [ ] Marking some `.graftignore` patterns confidential. Recorded as
      `docs/method/backlog/cool-ideas/CORE_confidential-graftignore-patterns.md`.
- [ ] Other surfaces that may derive responses from confidential files
      (`code_find`, `safe_read` refusal sizes, indexing). See the audit card.
- [ ] A shared terms block across readings. That is roadmap item A5, which
      builds on this field and the completeness work in A4.

## Acceptance Criteria

1. A fixture with one visible match and a refused file reports `total: 1` and
   `skipped` with the refused file's matches under its reason.
2. A match whose file cannot be loaded is counted under `UNREADABLE`.
3. The all-refused refusal carries `skipped` with every refused file.
4. An answer with nothing skipped reports zero counts.
5. The MCP and CLI output schemas accept the fields, and `code_refs`
   advertises `3.0.0`, whose registered validator accepts the emitted payload
   and rejects it without `contentDenial`.
6. Paired repositories differing only in a confidential file's content or
   existence produce identical responses across visible, empty, refused,
   scoped and warm-cache calls.
7. `SECRET` never appears in `skipped`, and confidential files are not counted
   in `provenance.filesSearched`.

## Test Strategy

RED: four cases in `test/unit/mcp/code-refs.test.ts` call the real tool
through an in-repo server. The unreadable case wraps the real process runner
and adds one match line, in the format of whichever engine answers (the test
image has no ripgrep, so grep answers there), for a path that does not exist.
That is how a file removed between search and load presents. All four fail on `main`
because the response has no `skipped` field.

GREEN: tally skipped files and matches by reason in the handler and add the
field to both output schema definitions.

Review follow-up RED: `test/unit/mcp/code-refs-confidentiality.test.ts`
builds paired repositories and compares whole response sequences. On
`5e71ee34` every pair fails: the `SECRET` count, the refusal versus
zero-matches split, `filesSearched`, and the receipt's byte counts and
compression ratio (derived from the secret file's size) all differ. The
schema-identity case fails because `code_refs` still advertises `2.0.0`.

Validation: `test/unit/mcp/code-refs.test.ts`,
`test/unit/mcp/code-refs-confidentiality.test.ts`,
`test/unit/policy/confidential.test.ts` and
`test/unit/contracts/output-schemas.test.ts` in the isolated runner,
`pnpm typecheck`, `pnpm lint`, `git diff --check`.
