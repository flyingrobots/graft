---
title: "Cycle 0025 — Layered Worldline Model"
---

# Cycle 0025 — Layered Worldline Model

**Sponsor human:** Repository Operator
**Sponsor agent:** Implementation Agent

## Premise

WARP Level 1 gave Graft a commit-grounded structural worldline. Cycle
0024 proved that precision reads can consume it directly. But the
moment we asked what a filesystem watcher should mean, the model got
muddy.

Users do not ask only commit questions.

They ask:
- "What changed on this branch?"
- "What is structurally true in my dirty workspace right now?"
- "What just happened when I switched branches?"
- "Which edits were probably human, agent, or git-induced?"

Those are not the same question. If Graft uses one storage model for
all of them, it will conflate durable history with transient local
state and become less trustworthy exactly where it aims to be most
useful.

The most useful user/agent-centered model is layered:
- one canonical commit worldline
- branch and ref views over that worldline
- one transient workspace overlay for the current checkout

## Hill

Graft can answer committed-history questions, branch questions, and
dirty-workspace questions without conflating durable structural history
with transient checkout state.

## Playback questions

### Agent perspective

- When the repo is dirty, can I ask what is structurally true right now
  and get live answers instead of stale indexed ones? **Must be yes.**
- Can I ask branch questions like "what changed on this branch" without
  Graft inventing a second conflicting truth store? **Must be yes.**
- If the checkout changes, does Graft report one semantic repo
  transition instead of a storm of low-level file events?
  **Must be yes.**
- Can live-edit provenance include attribution hints with explicit
  confidence and evidence? **Should be yes.**

### Operator perspective

- Does commit history remain the canonical durable worldline?
  **Must be yes.**
- Can branch switches, rebases, merges, and resets happen without
  corrupting or duplicating the canonical structural history?
  **Must be yes.**
- Does the design leave room for filesystem watching without making git
  operations unreadable noise? **Must be yes.**
- Are attribution claims inspectable and uncertainty explicit, rather
  than implied certainty? **Must be yes.**

## Non-goals

- Perfect authorship attribution for every live edit
- Replacing git commit history with sub-commit local history
- One separate durable WARP graph per branch
- Solving Level 2 symbol identity across renames in this cycle
- Full implementation of the watcher and overlay in this design-only
  cycle

## Design

### Layer A — Canonical Commit Worldline

The canonical WARP worldline remains commit-grounded.

- One durable structural history for the repository
- Commit identity is the storage anchor
- Ticks remain monotonic and causal
- No branch name becomes part of structural storage identity

Why:
- Commits are stable. Branch names are not.
- The same commit can belong to multiple branches.
- Rebase, rename, delete, and force-move operations make branch names a
  poor primary identity for durable storage.

This preserves the existing Level 1 value proposition from
`docs/design/0023-warp-graph-model/design.md`.

### Layer B — Branch / Ref Views

Branch questions are first-class, but branches are views over the
canonical commit worldline, not separate worldlines.

Examples:
- "What changed on this branch?" -> compare merge-base to branch tip
- "How far has this feature branch structurally diverged from main?" ->
  observer comparison between two refs
- "What would this PR change structurally?" -> branch/ref comparison

Branch names remain useful user vocabulary. They do not become storage
identity.

This explicitly rejects the earlier idea of one durable worldline per
branch.

### Layer C — Workspace Overlay

The current checkout gets a transient overlay that represents local
state not yet captured in the canonical commit worldline.

The overlay includes:
- unstaged edits
- staged but uncommitted edits
- untracked files
- watcher-detected live changes
- attribution hints and evidence for local changes

The workspace overlay is anchored to a **checkout epoch**.

Checkout epoch:
- the repo root path
- the baseline ref / HEAD commit
- the moment the current checkout state became active

When the checkout changes materially, the current epoch ends and a new
one begins.

### Semantic Repo Transitions

Filesystem watcher events are low-level signals, not user-facing facts.

Graft should synthesize watcher and git signals into semantic
transitions such as:
- `checkout`
- `reset`
- `merge`
- `rebase`
- `conflict-resolution`
- `index-update`

A branch switch should not read as "187 file edits." It should read as:
- prior checkout epoch ended
- semantic repo transition detected
- new checkout epoch started
- structural delta summarized against the new baseline

This is the key user-centered move. Operators and agents want meaning,
not event spam.

### Attribution Posture

Live-edit attribution must be explicit about uncertainty.

Each overlay event may carry:
- `actorGuess`: `agent` | `human` | `git` | `unknown`
- `confidence`: `high` | `medium` | `low`
- `evidence`: hook source, MCP receipt, process context, ref movement,
  watcher batch shape, or lack of direct evidence

Rules:
- Directly instrumented actions may justify high confidence
- Git-driven transitions should usually attribute to `git`
- Unexplained file mutations default to `unknown`, not false certainty

### Query Surface

The layered model should let Graft answer different questions from the
right layer:

- Commit question:
  "Show `evaluatePolicy` at `v0.3.0`." -> canonical commit worldline
- Branch question:
  "What changed structurally on this branch?" -> ref view over the
  canonical worldline
- Workspace question:
  "What live edits are not committed yet?" -> workspace overlay
- Provenance question:
  "Who likely changed this before the test started failing?" ->
  overlay provenance with evidence and confidence

### Storage and Honesty

The workspace overlay may be persisted locally for performance or
session continuity, but it must remain distinct from commit-grounded
history.

No fake micro-commits. No pretending transient local state is the same
thing as durable git history.

If a future cycle introduces true sub-commit WARP ticks, it must do so
as a named higher-level model, not by smuggling workspace noise into
Level 1 semantics.

## Deliverables

1. Official layered-worldline design document
2. Vocabulary for checkout epochs and semantic repo transitions
3. Clear rejection of per-branch durable worldlines as the primary
   storage model
4. Implementation guidance for watcher, overlay, and attribution work

## Effort

M — design cycle now, implementation likely L across follow-on cycles.

## Accessibility / assistive reading posture

All user-facing outputs from this model should remain reducible to
structured linear text and JSON summaries. A semantic repo transition
must be understandable without relying on timeline graphics or visual
event clustering.

## Localization / directionality posture

Not applicable at the model layer, but event labels and summaries
should avoid left/right spatial metaphors in future user-facing output.

## Agent inspectability / explainability posture

Every answer should reveal which layer it came from:
- `commit_worldline`
- `ref_view`
- `workspace_overlay`

Attribution claims must expose evidence and confidence. Graft should
never imply that it knows authorship or intent when it only inferred a
likely source.
