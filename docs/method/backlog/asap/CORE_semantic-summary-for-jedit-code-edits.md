---
title: "Semantic summary for jedit code edits"
legend: CORE
lane: asap
---

# Semantic summary for jedit code edits

Requested by `jedit`.

Context:
- `jedit` wants concise truthful summaries such as `renamed function`, `added method`, or `edited comments only` for drawers, causal views, and review surfaces.
- Today Graft is strong on structure, but the editor would benefit from a compressed semantic layer over those structural deltas.

Need:
- Add a semantic-summary surface over structural diffs or buffer snapshots.
- Keep the vocabulary bounded and machine-usable.
- Prefer summaries that can be trusted in a code-review or causal-history context.
