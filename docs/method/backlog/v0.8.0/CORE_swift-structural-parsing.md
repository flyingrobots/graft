---
title: "Swift structural parsing"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 24
effort: M
acceptance_criteria:
  - "`.swift` files are detected as parser-backed structured formats"
  - "Outlines include classes, structs, enums, protocols, extensions, functions, properties, and methods"
  - "Fixtures cover a protocol plus an extension-heavy type"
---

# Swift structural parsing

Swift support opens Graft to Apple-platform repositories and mobile
teams.

## First slice

- Detect `.swift`
- Extract types, protocols, extensions, functions, methods, and
  properties
- Keep result builders and macro-heavy code bounded
