---
title: "Ruby structural parsing"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 23
effort: M
acceptance_criteria:
  - "`.rb` files are detected as parser-backed structured formats"
  - "Outlines include modules, classes, methods, singleton methods, constants, and common block-style declarations"
  - "Fixtures cover a small Rails-style model or service object"
---

# Ruby structural parsing

Ruby support targets Rails and Ruby tooling repositories, where compact
class/module outlines are useful before reading dynamic code.

## First slice

- Detect `.rb`
- Extract modules, classes, methods, singleton methods, and constants
- Avoid framework inference until basic structural coverage is stable
