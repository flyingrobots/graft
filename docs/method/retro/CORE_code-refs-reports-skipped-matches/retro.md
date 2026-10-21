---
title: "code_refs skipped-match reporting retro"
cycle: CORE_code-refs-reports-skipped-matches
design_doc: docs/design/CORE_code-refs-reports-skipped-matches.md
outcome: implementation-validated
drift_check: yes
---

# code_refs skipped-match reporting retro

## What shipped

`code_refs` says what it left out without becoming an oracle for confidential
content.

- Every response, the visible-match answer and the all-refused refusal alike,
  carries `skipped: {files, matches, reasons}`. Reasons are the relevance
  omissions (`BINARY`, `LOCKFILE`, `MINIFIED`, `BUILD_OUTPUT`, `GRAFTIGNORE`)
  and `UNREADABLE` for a matched file that could not be loaded. Paths are not
  named. `total` stays the number of visible matches.
- Confidential files are removed before `rg` or `grep` runs. Confidentiality
  is decided by name alone (`isConfidentialPath`, `src/policy/confidential.ts`)
  and independently of which ban wins the displayed reason, so `dist/.env`,
  refused as `BUILD_OUTPUT`, is never searched.
- Confidential files are counted nowhere: not in `skipped`, not in
  `provenance.filesSearched`, not in a separate count. Every response states
  the constant rule `contentDenial: {classification: "SECRET",
  treatment: "not-searched", countsDisclosed: false}`. A `SECRET` refusal
  that reaches the tally fails closed.
- `graft.mcp.code_refs` advances from `2.0.0` to `3.0.0`.
- `docs/invariants/banned-never-leak.md` records the difference between
  relevance omission and content denial, and states that `.graftignore` is a
  relevance control.

## Playback

### Agent

- [x] One visible match and two matches in a `.graftignore`d file report
      `total: 1` and two skipped matches in one file under `GRAFTIGNORE`.
- [x] A matched file that disappears before it is loaded is counted under
      `UNREADABLE`.
- [x] When every match is refused, the refusal states the skipped counts.
- [x] When nothing was skipped, the answer reports zero counts.
- [x] Repositories that differ only in a confidential file's content, or in
      whether it exists, produce identical response sequences.
- [x] `dist/.env` is kept out of the search although it displays as
      `BUILD_OUTPUT`.
- [x] The validator named by the advertised `_schema` identity accepts the
      response, and rejects it without `contentDenial` or relabelled `2.0.0`.

### Human

- [x] One response tells whether `total` is the whole answer: `skipped` says
      how much was omitted for relevance, and `contentDenial` says that
      confidential files were not searched.

## What the cycle got wrong first

- **The first GREEN (`5e71ee34`) built an oracle.** It counted `SECRET`
  matches in `skipped` by reason. A count of matches in a confidential file is
  derived from its content, so a caller could test guesses. The external
  review ruled that confidential files must never reach the search, and that
  no count of them may be reported, because existence is metadata Graft has
  not declared public. The packet was amended (`81c7ab97`) before the fix.
- **The leak was wider than the count.** The paired-repository RED
  (`b6dfc34a`) showed the receipt's `returnedBytes` and `compressionRatio`
  were derived from the secret file's size, as was the refusal versus
  zero-matches split and `filesSearched`.
- **A false difference from the clock.** GREEN first failed four pairs on a
  one-byte `returnedBytes` difference. The cause was `latencyMs` gaining a
  digit between sessions, not the secret. The test pins the wall clock with a
  fake `Date` instead of normalizing sizes, so only the random session and
  trace ids are replaced before comparison. This change landed in the GREEN
  commit, after RED.
- **The unreadable case needed both engines.** The test image has no
  ripgrep, so `grep` answers there, and the first injected `rg`-format line
  never reached the tool (`8b319609`).

## Verification

- Full suite in the isolated Docker runner at `a208e717`: 280 files, 2628
  tests passed (rerun before this PR; see the PR body for the run).
- `tsc --noEmit`, `eslint .`, `git diff --check`: clean.
- The noninterference cases are finite fixtures. They support the property
  for visible, empty, refused, scoped, existence and warm-cache calls; they
  do not prove universal noninterference and do not cover timing.

## Drift

- The backlog DOT was regenerated for the two new cards. The SVG was
  regenerated afterwards in a container, because graphviz is not installed
  on the host.
- The packet cites roadmap item A3 on the unmerged planning branch
  `claude/roadmap-echo`.

## Follow-up

- `docs/method/backlog/bad-code/CORE_confidential-content-surface-audit.md`:
  `safe_read` and other refusals still report a confidential file's size,
  structural indexing can admit a parseable confidential file, and coverage
  reports may name confidential paths. Only `code_find` had a failing witness;
  it is fixed in its own change (`claude/code-find-secret-prefilter`). The
  product-wide confidentiality claim stays incomplete until the audit closes.
- `docs/method/backlog/cool-ideas/CORE_confidential-graftignore-patterns.md`:
  let a repository mark some ignore patterns confidential.
