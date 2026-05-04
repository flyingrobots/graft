---
report_id: "AUD-2026-05-04-Q-V01"
title: "Code Quality Audit: Graft Context Governor"
status: "Final"
audit:
  date_started: 2026-05-04
  date_completed: 2026-05-04
  type: "Full"
  scope: "src/**/*"
  compliance_frameworks: ["Internal Engineering Standards"]
target:
  repository: "github.com/flyingrobots/graft"
  branch: "main"
  commit_hash: "HEAD"
  language_stack: ["TypeScript 6.0", "Node.js 20+"]
  environment: "Development"
methodology:
  automated_tools: ["ESLint", "TSC"]
  manual_review_hours: 4
  false_positive_rate: "5%"
summary:
  total_findings: 12
  severity_count:
    critical: 0
    high: 2
    medium: 6
    low: 4
  remediation_status: "Pending"
related_reports:
  previous_audit: "2026-04-11_code-quality.md"
---

# Code quality audit: Graft context governor

## Executive Report Card

Developer Experience: 8 out of 10.

Best of: Multiple entry points, including API, CLI, and MCP, provide
strong flexibility for integration.

Internal Quality: 8.5 out of 10.

Watch out for: Complex orchestration functions in the MCP server layer,
especially `createGraftServer` and `invokeTool`, handle too many
concerns in one place.

Overall recommendation: thumbs up.

Justification: the codebase is robust, well architected, and supported
by strong hexagonal boundaries and comprehensive documentation.

## DX: Ergonomics and Interface Clarity

### Time To Value

Score: 9 out of 10.

The `npx @flyingrobots/graft init` command provides an excellent
onboarding path by automating configuration for multiple editors.

Action prompt:

> Refactor the init command to provide a `dry-run` flag that shows
> exactly which files will be modified and how, without requiring the
> user to run the write path first.

### Principle Of Least Astonishment

The `callGraftTool` API function returns the parsed payload directly but
requires a `GraftServer` instance. That can surprise users expecting a
more decoupled tool execution model.

Action prompt:

> Introduce a `GraftToolClient` that encapsulates the `GraftServer` and
> provides direct, typed methods for each tool, such as
> `client.safeRead(path)`.

### Error Usability

Generic error messages such as "Graft tool result did not contain a text
payload" in `tool-bridge.ts` are not diagnostic enough. They do not tell
the caller what was received or how to recover.

Action prompt:

> Update `src/api/tool-bridge.ts` to provide specific error messages
> based on the failed tool result, including actual payload types and a
> suggested server connection check.

## DX: Documentation and Extendability

### Documentation Gap

`docs/SETUP.md` is exhaustive, but daemon and worktree authorization
failures need a focused troubleshooting guide for developers moving
beyond single-repo setups.

Action prompt:

> Draft a daemon troubleshooting guide covering common authorization,
> binding, stale socket, and socket permission errors.

### Customization

Score: 8 out of 10.

The port and adapter architecture makes it straightforward to swap file
system or git client implementations.

Action prompt:

> Standardize the options pattern across primary adapters so dependency
> injection and behavior customization stay predictable.

## Internal Quality: Architecture and Maintainability

### Technical Debt Hotspot

`src/mcp/server-invocation.ts` contains `invokeTool`, a large function
that manages Zod parsing, access control, scheduling, and observability.

Action prompt:

> Extract daemon access enforcement, runtime event emission, and daemon
> scheduling from `invokeTool` into an invocation pipeline.

### Abstraction Violation

`CachedFile` in `src/operations/cached-file.ts` performs outline
extraction eagerly in its constructor. That couples a data snapshot to a
specific parser implementation.

Action prompt:

> Modify `CachedFile` to use lazy evaluation for outline and jump-table
> data, or move extraction to a separate file-structure parser service.

### Testability Barrier

The reliance on `AsyncLocalStorage` in `src/mcp/server-invocation.ts`
makes the invocation lifecycle hard to unit-test without setting up Node
async-local state.

Action prompt:

> Refactor `createInvocationEngine` to accept a mockable storage
> interface instead of directly using `node:async_hooks`.

## Internal Quality: Risk and Efficiency

### Critical Flaw

The MCP `safe_read` handler duplicates logic found in `RepoWorkspace`.
That creates a drift risk where API and MCP surfaces differ during cache
hits or diffs.

Action prompt:

> Consolidate cache and diff logic from `safeReadTool` into a shared
> governed-read service or the repo workspace path.

### Efficiency Sink

`extractOutlineForFile` is called whenever `CachedFile` is created, even
when policy later refuses the read.

Action prompt:

> Defer outline extraction until after policy permits structural data.

### Dependency Health

The project uses `tree-sitter-wasms` at `0.1.13`. Newer versions may
offer performance improvements and broader language support.

Action prompt:

> Update `tree-sitter-wasms` and `web-tree-sitter`, then verify that
> WASM loading remains compatible with the current runtime.

## Strategic Synthesis and Action Plan

Combined health score: 8.5 out of 10.

Strategic fix: refactor the MCP invocation path into a pipeline. This
improves internal maintainability and creates a better foundation for
observability and error reporting.

Strategic action prompt:

> Refactor `invokeTool` in `src/mcp/server-invocation.ts` into a
> `ToolInvocationPipeline` with handlers for Zod validation,
> authorization, scheduling, and logging.
