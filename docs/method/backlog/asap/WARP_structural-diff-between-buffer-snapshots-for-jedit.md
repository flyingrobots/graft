---
title: "Structural diff between buffer snapshots for jedit"
legend: WARP
lane: asap
---

# Structural diff between buffer snapshots for jedit

Requested by `jedit`.

Context:
- `jedit` is exploring causal/strand editing and wants structural diff between two unsaved buffer states, not only git refs or on-disk snapshots.
- This would support richer review, admission, and editor-side comparison flows.

Need:
- Add a `buffer_diff_symbols`-style surface for two buffer snapshots.
- Return changed/added/removed symbols plus bounded text range evidence where needed.
- Keep it honest about unsupported languages.
