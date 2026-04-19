---
title: "Sync child_process calls on request paths block testability and scale"
---

# Sync child_process calls on request paths block testability and scale

Source backlog item: `docs/method/backlog/bad-code/CLEAN_CODE_sync-child-process-request-path.md`
Legend: CLEAN

## Sponsors

- Human: James
- Agent: Codex

## Hill

All git and shell execution on product request paths flows through
explicit `ProcessRunner` and `GitClient` ports, and the operations layer
no longer imports `node:path` directly.

## Playback Questions

### Human

- [x] Can we move the repo to a fully hexagonal posture on the shell/git
  seams without regressing the current MCP and WARP behavior?

### Agent

- [x] Do grep checks show no direct `child_process` imports outside
  adapters?
- [x] Do `pnpm lint` and `pnpm test` still pass after the port cutover?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: keep the runtime seam small
  and explicit so operators can explain the command path in one hop
- Non-visual or alternate-reading expectations: preserve plain-text
  verification and deterministic grep evidence

## Localization and Directionality

- Locale / wording / formatting assumptions: no locale-sensitive behavior
  in scope
- Logical direction / layout assumptions: none beyond standard left-to-
  right source review

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: which port owns
  generic process execution and which port owns git execution
- What must be attributable, evidenced, or governed: verification must
  show both behavioral parity and the absence of direct platform imports

## Non-goals

- [x] Do not fully decompose the MCP server orchestration layer in this
  cycle
- [x] Do not redesign WARP indexing semantics beyond moving git access
  behind the new seam

## Backlog Context

Files:
- `src/mcp/repo-state.ts`
- `src/mcp/tools/run-capture.ts`
- `src/mcp/tools/code-refs.ts`
- `src/mcp/tools/git-files.ts`
- `src/mcp/tools/precision.ts`
- `src/git/diff.ts`
- `src/warp/indexer.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- SOLID 🔴

What is wrong:
- multiple product paths still use `execFileSync` directly
- this couples core behavior to the process environment and makes fast,
  isolated tests harder
- under heavier multi-agent/server workloads, sync shelling can become
  a latency and availability problem

Desired end state:
- introduce a shell/git execution port with bounded async operations,
  timeouts, and test fakes
- move request-path git observation and command execution behind that
  seam

Effort: L
