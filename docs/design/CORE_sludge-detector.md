---
title: "Sludge detector"
legend: "CORE"
cycle: "CORE_sludge-detector"
source_backlog: "docs/method/backlog/v0.7.0/CORE_sludge-detector.md"
---

# Sludge detector

Source backlog item: `docs/method/backlog/v0.7.0/CORE_sludge-detector.md`
Legend: CORE

## Hill

`doctor` can run an opt-in parser-backed sludge scan over tracked
source files. The scan uses tree-sitter parses and outlines to report
structural smell signals without turning normal `doctor` output into a
lint report.

## Playback Questions

### Human

- [x] Can I run `graft doctor --sludge --json` and see sludge metrics?
- [x] Can I scope the scan with `--path`?
- [x] Does normal `doctor` remain a runtime health check unless the
      sludge scan is explicitly requested?

### Agent

- [x] Does the detector flag JSDoc typedef/class imbalance, dense
      JSDoc type casts, and free factory functions that return object
      literals?
- [x] Does it avoid flagging a factory that delegates to `new X()`?
- [x] Are MCP and CLI output schemas aware of the optional `sludge`
      payload?

## Non-goals

- [x] Turning sludge detection into a linter or a release gate.
- [x] Requiring LSP type resolution.
- [x] Scanning unsupported file formats.

## Backlog Context

The release branch already has parser-backed outlines and the `doctor`
surface. This cycle adds a bounded structural smell detector as an
opt-in diagnostic:

- `doctor({ sludge: true })` for MCP/API callers
- `graft diag doctor --sludge --json`
- `graft doctor --sludge --json` as a short CLI alias

The detector reports:

- phantom shape pressure from `@typedef` comments outnumbering classes
- JSDoc `@type` cast density
- homeless constructor functions such as `build*`/`create*` that return
  plain object literals
- free functions whose first parameter is a project type
- high symbol count files
