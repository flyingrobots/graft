---
title: "Java structural parsing"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 18
effort: M
acceptance_criteria:
  - "`.java` files are detected as parser-backed structured formats"
  - "Outlines include packages, imports when useful, classes, interfaces, enums, records, annotations, methods, constructors, and fields"
  - "Visibility modifiers are reflected in exported evidence where practical"
  - "Fixtures cover a service class and an interface or record"
---

# Java structural parsing

Java remains a major enterprise and backend language. Structural
support makes Graft more useful in large service repositories.

## First slice

- Detect `.java`
- Extract classes, interfaces, enums, records, constructors, methods,
  and fields
- Keep annotation text bounded in signatures
