---
title: "JSON structured config projection"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 16
effort: S
acceptance_criteria:
  - "`.json` files are detected as structured document formats when policy allows"
  - "Outlines include top-level object keys and domain anchors for package manifests and schemas"
  - "Large JSON files stay bounded and avoid lockfile-style payload expansion"
  - "Fixtures cover `package.json`, `tsconfig.json`, and JSON Schema"
---

# JSON structured config projection

JSON is everywhere, but raw JSON can be noisy and lockfile-adjacent.
This card adds bounded structure for config and schema files without
weakening generated/lockfile policy.

## First slice

- Detect `.json`
- Extract top-level keys and well-known manifest/schema sections
- Preserve refusal behavior for generated, lockfile, and policy-denied
  paths
