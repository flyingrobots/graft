# WARP: Per-branch worldlines

Currently graft uses a single WARP worldline for the entire repo.
A better model: one worldline per git branch. Each branch traces
its own structural evolution independently.

This enables:
- "What changed structurally on this feature branch?"
- Branch-to-branch structural comparison via observer diff
- PR structural preview: compare feature branch worldline vs main
- Merge structural conflict detection (WARP_speculative-merge)

Implementation: use the branch name as part of the graph namespace
or writer ID. Each branch indexes independently. Main's worldline
is the canonical structural history.

Pairs with: WARP_speculative-merge, CORE_pr-review-structural-summary.
