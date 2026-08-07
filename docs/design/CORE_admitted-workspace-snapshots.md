---
title: "Admitted workspace snapshots for Graft analysis"
---

# Admitted workspace snapshots for Graft analysis

Source issue: [flyingrobots/graft#228](https://github.com/flyingrobots/graft/issues/228)
Parent goalpost: #232
Legend: CORE

## Sponsors

- Human: James
- Agent: Claude

## Hill

Graft analysis runs over bytes an observation settled, not over the disk it is
describing.

The whole feature is larger than one cycle. This packet names the whole hill
and then states plainly which part of it is standing and which part is not, so
that no reader — human or agent — mistakes the seam for the connection.

### What is actually true today

Every bounded `RepoWorkspace` analysis method reads exclusively through one
`WorkspaceReadView`. The semver-public `fs` constructor option and member
remain available to legacy filesystem-backed callers; that input is wrapped
as a `LiveWorkspaceReadSource` and is not consulted by analysis methods. The
`readView` constructor branch forbids a filesystem beside it, so a
snapshot-backed workspace cannot also reach the live disk.

Everything below that line is not connected:

- There is **no production decoder** that turns an Echo settlement into an
  `AdmittedWorkspaceSnapshot`. The only constructor is
  `unsafeAdmittedWorkspaceSnapshotForTest`.
- **Both production composition roots** (`src/api/repo-workspace.ts`,
  `src/mcp/repo-workspace.ts`) provide live-filesystem authority. The public
  API uses the compatibility constructor that normalizes it to a live read
  view; MCP constructs that view explicitly. Every real Graft read today is a
  live disk read.
- There is **no Graft-owned Edict source** declaring `ObserveWorkspaceSnapshot`,
  and therefore no request, claim, or settlement.

Graft's reads really do read. They read the live disk. They do not capture an
Echo-admitted read intent, and they do not replay from Echo-settled bytes.

That is an unfinished integration, not a failed architecture. The failure mode
worth guarding against is letting the unfinished integration wear finished
clothes.

### This cycle's hill

Close the gap between what the admitted-snapshot types *claim* and what they
*enforce*, before anything is built on top of them.

A type that declares `byteBudget`, `symlinkPolicy: "refuse"`, and an `aperture`
while enforcing only the aperture is making a semantic claim the code does not
honour. Downstream work that trusts those fields would inherit the lie.

## Acceptance

Carried from #228 (the whole feature). Checked items are met; unchecked items
are the remaining slices.

- [ ] exact Graft Edict source constructs a declared `ObserveWorkspaceSnapshot` request
- [ ] Echo admits the request before an adapter reads the workspace
- [ ] the request binds workspace root, path aperture, byte budget, symlink policy, and expected basis
- [ ] the adapter returns schema-bound bytes or content references plus basis evidence
- [ ] Echo admits the settlement before Graft analysis resumes
- [ ] parsing, indexing, search, and diff analysis are deterministic over the admitted snapshot
- [ ] unauthorized and escaped paths obstruct before observation
- [ ] duplicate and conflicting settlements are handled explicitly
- [ ] restart recovers pending observation without inventing an outcome
- [ ] replay consumes the retained settlement and does not reread the workspace
- [ ] no stdin/stdout command protocol, fake Echo transport, native Graft callback, or handwritten executable-operation package substitutes for the admitted path

### This cycle's acceptance

- [x] `byteBudget` must be a non-negative safe integer, and a snapshot whose
      settled bytes exceed it is refused at construction, not at read time
- [x] a path recorded as a symlink is refused, honouring `symlinkPolicy: "refuse"`
- [x] aperture and settled-file key set must agree exactly; disagreement is refused at construction
- [x] retained file collections and bytes are copied once at admission,
      validated from that defensive copy, and not exposed through the admitted
      snapshot descriptor
- [x] the copied snapshot descriptor, aperture, and exposed read-view evidence
      object and property are runtime-immutable, not only TypeScript-readonly
- [x] `MissingSnapshotBytesError` becomes unreachable by construction
- [x] the admitted read view and the live-filesystem ingress are not the same type and are not substitutable
- [x] no `basisDigest` sentinel stands in for "this has no basis"
- [x] each of `safeRead`, `fileOutline`, and `readRange` performs exactly one observation
- [x] a mutation between policy evaluation and projection cannot change the returned bytes
- [x] invalid UTF-8 never reaches a caller as replacement text
- [x] a UTF-8 BOM remains part of byte identity and cannot create a false cache hit
- [x] an authority refusal stays an authority refusal across every projection, never becoming not-found
- [x] only absence classified by the filesystem adapter or a standard portable
      missing-error shape becomes normalized `ENOENT` and then not-found;
      permission, resource, and snapshot-integrity failures propagate
- [x] no `as FileSystem` cast remains

Added during the cycle, not foreseen when it opened:

- [x] every MCP read path goes through the single read authority. `read_range`
      and `file_outline` built their own reads from `ctx.fs` and never applied
      workspace read policy at all; live `code_show` now carries the exact
      search content through policy evaluation and range projection instead of
      re-reading the matched file
- [x] policy is evaluated for every observation, not only decodable ones. The
      first version of the UTF-8 refusal shadowed `BINARY`, so a binary file
      was reported as an encoding problem instead of a banned one
- [x] refused `read_range` calls increment refusal metrics rather than successful-read metrics
- [x] invalid-UTF-8 `file_outline` and `read_range` outcomes use the standard
      refusal projection and increment refusal metrics
- [x] refused or otherwise empty `read_range` outcomes do not claim a line
      region was accessed in the runtime footprint
- [x] observation sizes use the shared non-negative integer output contract
- [x] the expanded `file_outline` and `read_outline` output contracts advertise
      schema version `2.0.0`
- [x] wrapped and split MCP/CLI outline schemas accept the same expanded
      cache-hit payload
- [x] the semver-public `RepoWorkspace({ fs })` constructor and `fs` member
      remain compatible while analysis normalizes reads to one named view
- [x] snapshot read exceptions expose stable `UNADMITTED_PATH` and
      `MISSING_SETTLED_BYTES` codes

## Playback Questions

### Human

- [x] If I read this packet and then read the code, will I correctly believe
      that production reads still hit the live disk?

  Yes. Both production composition roots provide live-filesystem authority:
  the public API has `RepoWorkspace` normalize its compatibility `fs` input,
  while MCP constructs `LiveWorkspaceReadSource` explicitly. The snapshot type
  says that no production settlement decoder exists.

- [x] Can a snapshot exist that claims a byte budget it exceeds?

  No. Construction sums every settled file and refuses totals above the
  declared budget; the inclusive boundary is covered separately.

- [x] When Graft refuses a path I am not allowed to read, does it tell me that,
      or does it tell me the file does not exist?

  It preserves the authority refusal. An unadmitted path throws
  `UnadmittedPathError`; actual absence remains a `NOT_FOUND` or
  `file_not_found` result.

### Agent

- [x] Can I construct an `AdmittedWorkspaceSnapshot` that violates its own
      declared fields?

  No. The only constructor available in this cycle validates aperture
  totality, duplicate paths, byte budget, and symlink refusal before applying
  the test-only admission assertion.

- [x] Can I pass a live-filesystem view where admitted evidence is required and
      have it compile?

  No. `LiveWorkspaceReadSource` does not implement
  `AdmittedWorkspaceReadView`; the compile-time regression proves the two are
  not substitutable.

- [x] Does any single operation observe the same path more than once?

  No. `safeRead`, `fileOutline`, `readRange`, and `changedSince` each enter
  through `RepoWorkspace.observe`; the three projecting read operations have
  explicit one-observation regressions, including mutation-between-read
  mutants.

- [x] Does any comment in `workspace-read-view.ts` describe behavior that does
      not exist yet as though it exists?

  No. The module distinguishes the landed single-authority seam from the
  unconnected settled side and names the brand as compile-time friction rather
  than runtime settlement evidence.

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: refusal reasons are distinct,
  stable kinds rather than one collapsed not-found. Snapshot read errors expose
  `UNADMITTED_PATH` and the defensive, admission-unreachable
  `MISSING_SETTLED_BYTES` through their `code` field; projected outcomes expose
  `INVALID_UTF8` and `NOT_FOUND` through `reason`. Admission rejects an aperture
  with missing bytes earlier through `SnapshotAdmissionError.code` value
  `MISSING_APERTURE_BYTES`.
- Non-visual or alternate-reading expectations: every refusal exposes a
  machine-readable `code` or `reason`, not only prose in a message string.

## Localization and Directionality

Path handling is byte- and codepoint-exact. Paths are not case-folded,
normalized, or reordered for display. Invalid UTF-8 in file *content* is
surfaced as a typed outcome rather than being replaced, which is what makes
non-UTF-8 source trees legible instead of silently corrupted.

## Agent Inspectability and Explainability

An agent must be able to answer "where did these bytes come from?" from the
returned value alone. Today the honest answer is "the live disk at call time,"
and the type system should say so by name rather than by a sentinel digest.

## Non-goals

- workspace mutation
- Git or GitHub automation
- git-warp migration
- production default cutover
- the autonomous delivery loop
- **this cycle only:** the production settlement decoder, the Graft-owned Edict
  source, restart recovery, and zero-reread replay. Those are the following
  slices, and this packet must not be read as claiming them.

## Deferred, with reasons

Named here so they are not silently dropped:

- **The first-basis protocol question.** Hello Echo's request fixture computes
  the expected basis *before* sending the request, so it is a verify-and-admit
  protocol, not a first-observation protocol. Graft's first read of an unknown
  dirty workspace has no basis to declare. Resolving this is an Echo/Edict
  decision (propose-and-admit vs. unknown-basis observation), not a Graft one,
  and it gates the real-admission slice.
- **hello-echo#26 (closed 2026-08-04)** — the observation host did not project
  basis/evidence fields, so a settlement could not be bound to observed bytes.
  Its closure removes that external condition, but Graft still has no decoder
  or first-basis protocol and #228 remains open.
- **`intent` is a no-op.** Removed from the `safeRead` operation, which now
  takes only what it uses, but still declared on the MCP surface where removing
  it would be a breaking schema change. Filed as
  `bad-code/CLEAN_safe-read-intent-is-decorative.md`.
- **`hashContent`, `deterministic-replay.ts`, and the MCP receipt** all borrow
  evidence vocabulary without the substance. Filed as
  `bad-code/CLEAN_evidence-grade-naming-overclaims.md`.
- **Duplicate bounded-read and policy-wrapper implementations.** Filed as
  `bad-code/CLEAN_duplicate-bounded-read-implementations.md`.

## Backlog Context

Dependency graph, corrected: #228 needs hello-echo#10 (closed 2026-07-30).
#229 needs #228. #237 needs hello-echo#11 (closed). #228 carried a
`state: blocked` label for three days after its dependency closed; the label
was wrong, not the dependency.

## Implementation Notes

The double-observation window in `fileOutline` and `readRange` is only a real
TOCTOU hazard for the live-filesystem view — snapshot bytes are immutable, so
two reads of a snapshot agree by construction. The repair is still correct: it
removes the hazard from the transitional adapter and removes the second read
from both.

`safeRead` already accepts pre-read `content` and skips its own read when given
it, so it is close to single-observation already. Its UTF-8 defect is in the
fall-through: when the fatal decoder throws, `content` arrives undefined, the
helper re-reads raw bytes and `Buffer.toString("utf-8")` substitutes U+FFFD.
