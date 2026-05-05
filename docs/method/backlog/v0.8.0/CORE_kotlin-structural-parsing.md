---
title: "Kotlin structural parsing"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 25
effort: M
acceptance_criteria:
  - "`.kt` and `.kts` files are detected as parser-backed structured formats"
  - "Outlines include packages, classes, data classes, objects, interfaces, enums, functions, properties, and extension functions"
  - "Fixtures cover an Android- or service-style Kotlin file"
---

# Kotlin structural parsing

Kotlin support helps Android and JVM service repositories while staying
close to tree-sitter structural extraction.

## First slice

- Detect `.kt` and `.kts`
- Extract classes, objects, interfaces, enums, functions, extension
  functions, and properties
- Keep annotation signatures bounded
