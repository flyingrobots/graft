---
title: Automatic breaking change detection
requirements:
  - WARP Level 1 indexing (shipped)
  - graft_since structural diff (shipped)
  - Export surface diff (backlog)
acceptance_criteria:
  - Comparing two tags identifies removed exported symbols and changed exported signatures
  - Detected breaking changes auto-generate BREAKING CHANGE commit footer text
  - Semver bump suggestions are produced (major for removals/signature changes)
  - An API migration guide is generated from the structural delta without human annotation
  - Non-breaking additions (new exports, additive parameters) are not flagged as breaking
  - A test verifies that removing an exported function between two tags is detected as breaking
---

# Automatic breaking change detection

Compare export surfaces between two tags. Exported signature
changed? Exported symbol removed? That's a breaking change.

Auto-generate BREAKING CHANGE commit footers. Suggest semver
bumps. Produce API migration guides. All from the structural
delta, zero human annotation.

"v0.4.0 → v0.5.0: evaluatePolicy gained a required parameter.
This is a BREAKING CHANGE. Consumers must update call sites."

Depends on: WARP Level 1 (shipped), export surface diff (backlog),
graft_since (shipped).
