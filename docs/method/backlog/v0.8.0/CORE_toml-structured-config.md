---
title: "TOML structured config projection"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 15
effort: S
acceptance_criteria:
  - "`.toml` files are detected as structured document formats"
  - "Outlines include tables, array tables, dependencies, scripts, and tool sections"
  - "Fixtures cover `pyproject.toml` and `Cargo.toml`"
---

# TOML structured config projection

TOML is central to Python and Rust project metadata. A compact table
outline gives agents enough structure to choose targeted reads.

## First slice

- Detect `.toml`
- Extract table headers and important package/tool sections
- Keep values bounded and avoid exposing secrets from config payloads

## Implementation status

- Pulled into `cycle/CORE_structural-test-coverage-map` with parser
  runtime detection, table and array-table outlines, bounded scalar and
  collection signatures, and `pyproject.toml` plus `Cargo.toml` fixture
  coverage.
