---
title: "PHP structural parsing"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 22
effort: M
acceptance_criteria:
  - "`.php` files are detected as parser-backed structured formats"
  - "Outlines include namespaces, classes, interfaces, traits, functions, methods, properties, and constants"
  - "Fixtures cover a small controller/service class and standalone function"
---

# PHP structural parsing

PHP support helps Graft remain useful in long-lived web repositories,
especially Laravel and WordPress-adjacent codebases.

## First slice

- Detect `.php`
- Extract namespace, type, function, method, property, and constant
  declarations
- Keep framework-specific route discovery out of the first slice
