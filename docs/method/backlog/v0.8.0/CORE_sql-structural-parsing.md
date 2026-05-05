---
title: "SQL structural parsing"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 12
effort: M
acceptance_criteria:
  - "Common `.sql` migration and schema files are detected as structured formats"
  - "Outlines include tables, views, indexes, triggers, functions, procedures, and named migration blocks when visible"
  - "Large migration files produce compact jump-table navigation"
  - "Fixtures cover schema DDL and migration-style SQL"
---

# SQL structural parsing

Add structural projection for database files so agents can inspect
schema and migration shape without reading large raw SQL files.

## First slice

- Detect `.sql`
- Prefer table, view, index, trigger, function, and procedure entries
- Keep dialect assumptions conservative
- Treat unsupported dialect constructs as partial outline evidence, not
  hard failures
