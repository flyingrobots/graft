---
title: "C++ structural parsing"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 21
effort: L
acceptance_criteria:
  - "Common C++ suffixes are detected as parser-backed structured formats"
  - "Outlines include namespaces, classes, structs, enums, templates, methods, functions, and includes"
  - "Fixtures cover header/source pairs and template-heavy declarations"
  - "Extractor complexity stays bounded and does not attempt full semantic resolution"
---

# C++ structural parsing

C++ is valuable for performance-critical and systems repositories, but
it carries a higher complexity tax than Python or Go.

## First slice

- Detect `.cc`, `.cpp`, `.cxx`, `.hpp`, `.hh`, `.hxx`, and `.ipp`
- Extract declarations conservatively
- Avoid pretending templates/macros are semantically resolved
