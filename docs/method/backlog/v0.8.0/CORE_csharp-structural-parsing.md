---
title: "C# structural parsing"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 19
effort: M
acceptance_criteria:
  - "`.cs` files are detected as parser-backed structured formats"
  - "Outlines include namespaces, classes, records, structs, interfaces, enums, properties, methods, and constructors"
  - "Partial classes and nested types remain bounded and navigable"
  - "Fixtures cover a service class and record DTO"
---

# C# structural parsing

C# support broadens Graft into .NET enterprise, tooling, and game
development repositories.

## First slice

- Detect `.cs`
- Extract namespaces, types, properties, methods, constructors, and enum
  values
- Keep partial/nested structures navigable without expanding bodies
