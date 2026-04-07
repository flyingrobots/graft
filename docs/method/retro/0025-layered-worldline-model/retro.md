# Cycle 0025 — Layered Worldline Model

**Hill:** Graft can answer committed-history questions, branch
questions, and dirty-workspace questions without conflating durable
structural history with transient checkout state.

**Outcome:** Met.

## What shipped

- Official layered-worldline model with three explicit layers:
  `commit_worldline`, `ref_view`, and `workspace_overlay`
- MCP-visible layer classification on `code_show`, `code_find`,
  `graft_since`, and `graft_diff`
- `doctor` reporting `checkoutEpoch`, `lastTransition`, and
  `workspaceOverlay`
- First semantic transition slice for `checkout`, `reset`, `merge`, and
  `rebase`
- Conservative workspace attribution posture with explicit
  `unknown` / `low` defaults and inspectable evidence
- RED witness coverage spanning playback questions, golden path,
  failure modes, edge cases, and stress behavior

## Playback

- Agent: when the repo is dirty, can I ask what is structurally true
  right now and get live answers instead of stale indexed ones?
  **Yes.**
- Agent: can I ask branch questions without Graft inventing a second
  conflicting truth store? **Yes.**
- Agent: if the checkout changes, does Graft report one semantic repo
  transition instead of a storm of low-level file events? **Yes** on the
  current MCP surface.
- Agent: can live-edit provenance include attribution hints with
  explicit confidence and evidence? **Yes** — minimally and
  conservatively.
- Operator: does commit history remain the canonical durable worldline?
  **Yes.**
- Operator: can branch switches, rebases, merges, and resets happen
  without corrupting or duplicating canonical structural history?
  **Yes.**
- Operator: does the design leave room for filesystem watching without
  making git operations unreadable noise? **Yes.**
- Operator: are attribution claims inspectable and uncertainty explicit?
  **Yes.**

## Drift

- 0025 was written as a design-first cycle, but the RED packet made the
  first implementation slice concrete enough that the cycle ended up
  shipping real MCP semantics, not just vocabulary.
- The shipped implementation detects semantic repo transitions between
  tool calls using Git state and reflog evidence. That is enough to make
  the model real, but it is not yet a persistent watcher or a full live
  event stream.

## Lessons

- The three-layer model was the right correction. It removed the false
  choice between path-local history and per-branch durable storage.
- Explicit layer labeling materially improves answer honesty. Agents can
  now see whether a result came from durable history, a ref comparison,
  or live workspace state.
- A conservative provenance posture is good product behavior. Saying
  `unknown` with evidence is much better than implying authorship we do
  not actually know.
- Semantic repo transitions are already useful before any watcher
  exists. Git state plus reflog evidence gave us a strong first slice.

## Follow-on work

- `docs/method/backlog/up-next/WARP_reactive-workspace-overlay.md`
- `docs/method/backlog/up-next/WARP_persisted-sub-commit-local-history.md`
- `docs/method/backlog/up-next/WARP_richer-semantic-transitions.md`
- `docs/method/backlog/up-next/WARP_provenance-attribution-instrumentation.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-control-plane-for-persistent-monitors.md`
