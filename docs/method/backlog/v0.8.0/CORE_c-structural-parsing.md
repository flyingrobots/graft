---
title: "C structural parsing"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 20
effort: M
acceptance_criteria:
  - "`.c` and `.h` files are detected as parser-backed structured formats"
  - "Outlines include functions, structs, enums, typedefs, macros, and includes when practical"
  - "Fixtures cover source/header pairs"
  - "Macro-heavy files degrade to partial outlines rather than failing"
---

# C structural parsing

C support helps systems, embedded, native extension, and runtime
repositories where raw-file reads are especially costly.

## First slice

- Detect `.c` and `.h`
- Extract functions, structs, enums, typedefs, macros, and includes
- Preserve partial outline behavior for macro-heavy code
