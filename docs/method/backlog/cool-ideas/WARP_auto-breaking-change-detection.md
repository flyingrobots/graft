---
title: "Automatic breaking change detection"
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
