---
title: SURFACE local history dag render mode and count legend
lane: cool-ideas
legend: SURFACE
---

# SURFACE local history dag render mode and count legend

## Why

When `diag local-history-dag` degrades to Bijou pipe-mode, the visible line count is smaller than the underlying node and edge counts. That is truthful, but it is not self-explanatory, and it creates operator confusion about whether the graph is incomplete or malformed.

## Shape

- show render mode explicitly, for example `render: bijou-pipe` vs `render: bijou-dag`
- clarify count semantics in the header
- explain that compressed pipe-mode lines may summarize multiple outgoing edges

## Acceptance sketch

- an operator can immediately tell whether the DAG is in full layout mode or compressed pipe-mode
- node and edge counts no longer look inconsistent with the rendered listing
