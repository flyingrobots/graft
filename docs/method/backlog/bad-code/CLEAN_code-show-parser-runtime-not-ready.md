---
title: "code_show leaks parser-runtime invariant as raw MCP error"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 3
effort: S
status: open
reported: 2026-06-10
---

# code_show leaks parser-runtime invariant as raw MCP error

## Problem

Calling the `code_show` MCP tool without a `path` early in a session fails
with the internal invariant message "Parser runtime is not ready; await
ensureParserReady() before synchronous structured parsing." Sibling tools
(`safe_read`, `file_outline`, `code_find`) succeed in the same session, so the
project-wide symbol search path in `code_show` reaches synchronous structured
parsing before awaiting parser readiness.

## Risk

An agent's first `code_show` call burns a tool round-trip on an error that
names an internal function instead of a governed diagnostic. It also suggests
an initialization-order dependency between tools: surfaces that lazily await
`ensureParserReady()` behave differently from ones that assume it already ran.

## Desired Outcome

Every MCP tool path that needs the parser awaits readiness itself, and
substrate initialization failures surface as governed refusals with reason
codes, not raw invariant strings.

## Acceptance Criteria

- `code_show` succeeds as the first parser-touching call of a session,
  with and without `path`.
- No MCP tool response contains the literal `ensureParserReady` invariant
  message.
- A regression test covers first-call ordering for parser-dependent tools.
