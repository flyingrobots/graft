---
report_id: "AUD-2026-05-04-S-V01"
title: "Ship Readiness Audit: Graft Context Governor"
status: "Final"
audit:
  date_started: 2026-05-04
  date_completed: 2026-05-04
  type: "Full"
  scope: "Entire Repository"
  compliance_frameworks: ["Production Readiness Standards"]
target:
  repository: "github.com/flyingrobots/graft"
  branch: "main"
  commit_hash: "HEAD"
  language_stack: ["TypeScript 6.0", "Node.js 20+"]
  environment: "Staging/Production"
methodology:
  automated_tools: ["ESLint", "TSC", "Vitest"]
  manual_review_hours: 4
  false_positive_rate: "5%"
summary:
  total_findings: 8
  severity_count:
    critical: 0
    high: 1
    medium: 3
    low: 4
  remediation_status: "Pending"
related_reports:
  previous_audit: "2026-04-11_ship-readiness.md"
---

# Ship readiness audit: Graft context governor

## Quality and Maintainability

Technical debt score: 3 out of 10.

Justification: the codebase is notably clean and follows the intended
hexagonal architecture. The main remaining issues are orchestration
shape, duplicated read logic, and eager parsing.

Top issues:

1. Large tool invocation engine: `createInvocationEngine` and
   `invokeTool` in `src/mcp/server-invocation.ts` are overly complex.
2. Duplicate logic: the MCP `safe_read` handler duplicates
   `RepoWorkspace` read logic.
3. Eager parsing: `CachedFile` parses files in the constructor
   regardless of later policy outcomes.

### Readability and Consistency

Issue 1: `InvocationStore` and `InvocationEngine` use
`AsyncLocalStorage` in a way that is invisible to most tool handlers.
That can make footprint tracking hard to follow.

Mitigation prompt:

> Add JSDoc comments to `ToolContext` and `InvocationStore` explaining
> the relationship between tool calls, footprints, and async-local
> tracking.

Issue 2: `rawContent.split("\n").length` and
`Buffer.byteLength(rawContent)` appear in more than one read path.

Mitigation prompt:

> Refactor `RepoWorkspace` and `safe-read.ts` to consistently use
> snapshot `actual` values for line and byte counts.

Issue 3: the `init` command argument parsing logic in `init-model.ts`
is manual and more brittle than the rest of the CLI.

Mitigation prompt:

> Migrate init argument parsing to a structured shared CLI utility.

### Code Quality Violations

Violation 1: `invokeTool` in `src/mcp/server-invocation.ts` is a large
function with high cyclomatic complexity.

Suggested rewrite shape:

```ts
async function invokeTool(name, handler, args, ctx) {
  const invocation = this.createInvocation(name, args);
  return this.pipeline.run(invocation, async () => {
    const execution = await this.prepareExecution(name, invocation);
    return handler(args, ctx);
  });
}
```

Mitigation prompt:

> Refactor `invokeTool` into a pipeline where authorization,
> scheduling, and logging are handled by discrete middleware steps.

Violation 2: `RepoWorkspace.safeRead` has nested file-read and cache
logic that makes the flow hard to follow.

Suggested rewrite shape:

```ts
const snapshot = await this.getFileSnapshot(filePath);
if (snapshot && this.shouldUseCache(snapshot)) {
  return this.handleCacheHit(snapshot);
}
return safeRead(filePath, { ...options, content: snapshot?.rawContent });
```

Mitigation prompt:

> Extract snapshot acquisition and cache handling from
> `RepoWorkspace.safeRead`.

Violation 3: `createGraftServer` in `src/mcp/server.ts` instantiates
many runtime services in one function.

Suggested rewrite shape:

```ts
export function createGraftServer(options) {
  const deps = resolveDependencies(options);
  const engine = createInvocationEngine(deps);
  const mcpServer = setupMcpServer(deps, engine);
  return new GraftServerImpl(mcpServer, engine, deps);
}
```

Mitigation prompt:

> Decompose `createGraftServer` into focused factory functions for the
> engine, MCP server surface, and workspace router.

## Production Readiness and Risk

### Top Immediate Risks

Risk 1: potential race condition in daemon offloading.

If a worker updates the observation cache while a main-thread tool call
is finishing, cache state could drift.

Mitigation prompt:

> Review daemon worker cache update logic in `server-invocation.ts` and
> implement atomic update behavior for observation cache reconciliation.

Risk 2: runtime observability failures.

If `runtimeLogger.log` fails repeatedly, it could slow tool calls even
when errors are caught.

Mitigation prompt:

> Implement a circuit breaker or in-memory queue for the runtime event
> logger so logging failures never block tool execution.

Risk 3: schema strictness consistency.

Some tool schemas rely on strict validation through registration. The
project should keep that behavior explicit and consistent.

Mitigation prompt:

> Ensure every registry tool schema is strictly validated.

### Security Posture

Vulnerability 1: generic path traversal errors in `repo-paths.ts` could
be more descriptive while avoiding host path leakage.

Mitigation prompt:

> Add a safe `PathTraversalError` with an operator-friendly message.

Vulnerability 2: `run_capture` allows shell execution. It has posture
and redaction controls, but it remains the highest-risk command surface.

Mitigation prompt:

> Review `run_capture` redaction logic and verify
> `GRAFT_ENABLE_RUN_CAPTURE` is enforced at the handler boundary.

### Operational Gaps

- Liveness and readiness endpoints for daemon internals.
- Resource exhaustion protection for rapid concurrent tool calls.
- A diagnostic bundle command with logs, state, and doctor output.

## Final Recommendations and Next Step

Final ship recommendation: yes, but continue hardening.

Recommended hardening focuses on the core invocation engine and the
duplicated governed-read logic.

Prioritized actions:

1. Refactor `invokeTool` to use a pipeline or middleware pattern.
2. Consolidate `safe_read` logic between the tool handler and
   `RepoWorkspace`.
3. Standardize all tool schemas with strict validation.
