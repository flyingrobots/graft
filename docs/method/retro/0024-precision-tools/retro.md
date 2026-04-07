# Cycle 0024 — Precision Tools

**Hill:** An agent can focus on a symbol by name and search symbols
across the project in one call, using WARP when the indexed world
matches the query target and falling back to live parsing when it does
not.

**Outcome:** Partial.

## What shipped

- `code_show` with one-call symbol focus
- `code_find` with project-wide name/kind search
- WARP-backed historical `code_show(ref=...)` when the target commit is
  indexed
- Live git-content fallback for historical reads when the target commit
  is not indexed
- Dirty-working-tree correctness: precision reads fall back to live
  facts instead of serving stale indexed answers
- Untracked draft-file visibility in live precision search
- Deterministic temp-repo precision tests instead of local-repo-state
  coupling

## Playback

- Agent: can I get the source code of a function by name in one call?
  **Yes.**
- Agent: can I search for symbols matching a pattern across the
  project? **Yes.**
- Agent: can I see where a symbol lived at a previous commit? **Yes** —
  WARP-backed when indexed, live fallback when not.
- Human: do the tools stay correct when the workspace is dirty?
  **Yes** — live facts win over stale indexed state.
- Human: do the tools fully satisfy the operator-side policy and
  enforcement expectations from the design doc? **Not yet.**

## Why partial

The agent-facing hill landed, but the operator-facing playback question
about full policy fidelity is still open. We added the broad policy
audit as follow-on backlog instead of claiming that closure from
partial evidence.

That disagreement is scope, not correctness. The tools are useful and
honest, but the cycle packet is not strong enough to say the whole
design was met end-to-end.

## Drift

- Dogfooding precision tools in dirty repos exposed a bigger modeling
  question than 0024 itself: what is the authoritative relationship
  between commit history, branch questions, and live workspace state?
  We fixed immediate correctness in code, but the architectural answer
  belongs to a new cycle.
- The cycle ended up proving that "projection before parse" needs a
  world-state qualifier. Indexed answers are only authoritative when the
  indexed state actually matches the query target.

## Lessons

- "Use WARP when indexed" is too blunt. The real rule is "use WARP when
  the indexed world you are observing is the one the user asked about."
- Dirty-workspace behavior is not a watcher enhancement. It is a
  correctness property.
- Precision tool tests should never depend on the developer's ambient
  repo state. Temp repos made the intended behavior much clearer.
- Branch questions are important, but that does not automatically mean
  branch-specific storage is the right model.

## Follow-on work

- `docs/method/backlog/asap/CORE_policy-fidelity-audit-all-tools-and-cli.md`
- `docs/method/backlog/asap/CORE_versioned-json-output-schemas.md`
- `docs/method/backlog/asap/CORE_test-isolation-and-sandbox-audit.md`
- Cycle 0025: layered worldline model
