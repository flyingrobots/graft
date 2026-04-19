---
title: "runtime validated command and context models"
cycle: "CORE_runtime-validated-command-and-context-models"
design_doc: "docs/design/CORE_runtime-validated-command-and-context-models.md"
outcome: hill-met
drift_check: yes
---

# runtime validated command and context models Retro

## Summary

This first-pass slice tightened two real boundary seams instead of trying to type the whole repo at once. Tool payload parsing for the API and MCP paths now treats results as runtime-validated JSON objects instead of `JSON.parse(...) as Record<string, unknown>`, and the attributed-read observation path now uses explicit validated models for args and result shapes before recording local history evidence. The public `callGraftTool(...)` surface also now carries schema-backed MCP output types for direct library consumers.

## Playback Witness

- [verification.md](/Users/james/git/graft/docs/method/retro/0082-runtime-validated-command-and-context-models/witness/verification.md)

## Drift

- None recorded.

## New Debt

- None recorded.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
