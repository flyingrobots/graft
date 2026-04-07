# Audit 3: Ship Readiness

**Date:** 2026-04-07

## 1. Quality & Maintainability Assessment

### 1.1 Technical Debt Score: 6/10

**Justification:**

1. **Synchronous subprocess dependence in critical paths**  
   `bin/graft.js`, `src/mcp/repo-state.ts`, `src/warp/indexer.ts`, `src/git/diff.ts`, and `src/mcp/tools/run-capture.ts` all rely on `execFileSync`, which couples product behavior tightly to shell and git availability.
2. **High-coupling orchestrators**  
   `src/warp/indexer.ts` and `src/mcp/repo-state.ts` each mix environment access, parsing, domain interpretation, and coordination logic in the same module.
3. **Behavior split across surface layers**  
   CLI/entrypoint behavior is spread across `bin/graft.js`, `src/cli/main.ts`, generated config snippets in `src/cli/init.ts`, and docs, which increases drift risk when transport behavior changes.

### 1.2 Readability & Consistency

#### Issue 1

The entry behavior is split between `bin/graft.js` and `src/cli/main.ts`, with the non-interactive compatibility fallback only discoverable by reading both files.

**Mitigation Prompt 1:**  
`Document and simplify the CLI entry contract by introducing a dedicated entrypoint module that owns interactive help behavior, explicit serve startup, and any legacy compatibility fallback. Update tests and docs so a new engineer can understand launch behavior from one source of truth.`

#### Issue 2

`src/warp/indexer.ts` has minimal narrative guidance relative to its complexity. It is hard for a new engineer to follow the transition from raw git history to WARP patch writes without reverse-engineering the module.

**Mitigation Prompt 2:**  
`Refactor src/warp/indexer.ts with clear collaborator boundaries and add contributor-facing architecture notes that explain commit enumeration, structural patch derivation, and graph writes. Preserve behavior, but make the logical phases explicit in both code structure and documentation.`

#### Issue 3

The runtime architecture is not summarized anywhere in a single contributor-facing document. A new engineer must cross-read `README.md`, `docs/GUIDE.md`, `docs/BEARING.md`, `METHOD.md`, and several source modules to form a mental model.

**Mitigation Prompt 3:**  
`Create ARCHITECTURE.md for Graft that explains the major runtime surfaces (CLI, MCP, hooks), the shared policy seam, the layered worldline model, and the WARP write/read split, then link it from README.md and CONTRIBUTING.md.`

### 1.3 Code Quality Violations

#### Violation 1

`src/mcp/tools/run-capture.ts` mixes command execution, output truncation, failure shaping, log persistence, and policy-boundary response formatting.

**Original Code Snippet**

```ts
output = execFileSync("sh", ["-c", command], { ... });
...
await ctx.fs.writeFile(logPath, output, "utf-8");
return ctx.respond("run_capture", {
  output: tailed,
  totalLines: lines.length,
  ...
});
```

**Simplified Rewrite 1**

```ts
const result = shellRunner.capture(command, { cwd: ctx.projectRoot, timeoutMs: 30_000 });
const persisted = await captureLogStore.persist(result.fullOutput);
return respondCapture(ctx, result, persisted, policyBoundary);
```

**Mitigation Prompt 4:**  
`Split src/mcp/tools/run-capture.ts into three focused units: shell execution, capture-log persistence/redaction, and MCP response shaping. Preserve the public tool contract, but make command execution and log persistence independently testable and policy-aware.`

#### Violation 2

`src/mcp/repo-state.ts` combines raw git execution, status parsing, transition inference, and stateful observation tracking.

**Original Code Snippet**

```ts
function captureSnapshot(cwd: string): RepoSnapshot {
  const statusOutput = readGitPorcelain(["status", "--porcelain"], cwd) ?? "";
  ...
  return {
    headRef: readGit(["symbolic-ref", "--quiet", "--short", "HEAD"], cwd),
    headSha: readGit(["rev-parse", "HEAD"], cwd),
    reflogSubject: readGit(["reflog", "-1", "--format=%gs"], cwd),
    ...
  };
}
```

**Simplified Rewrite 2**

```ts
const snapshot = gitProbe.captureSnapshot(cwd);
const transition = transitionClassifier.detect(previousSnapshot, snapshot);
this.observation = observationFactory.build(snapshot, transition, this.checkoutEpoch);
```

**Mitigation Prompt 5:**  
`Extract git probing, transition classification, and observation shaping from src/mcp/repo-state.ts into separate collaborators. Keep RepoStateTracker as the stateful coordinator, but remove direct git subprocess calls and parsing from the class boundary.`

#### Violation 3

`src/warp/indexer.ts` owns both git history collection and graph patch application.

**Original Code Snippet**

```ts
const commits = listCommits(cwd, options.from, options.to);
for (const sha of commits) {
  const changes = getCommitChanges(sha, cwd);
  if (hasRemovals) {
    await warp.core().materialize();
  }
  ...
}
```

**Simplified Rewrite 3**

```ts
for (const commit of historyReader.list(options)) {
  const facts = await patchBuilder.build(commit);
  await patchWriter.apply(facts);
}
```

**Mitigation Prompt 6:**  
`Refactor src/warp/indexer.ts into a history reader, a structural patch builder, and a graph writer. Preserve indexCommits() as the orchestration entrypoint, but move git IO, patch construction, and write-side policy into explicit units with focused tests.`

## 2. Production Readiness & Risk Assessment

### 2.1 Top 3 Immediate Ship-Stopping Risks

#### Risk 1

**Critical — `src/mcp/tools/run-capture.ts:1-77`**  
`run_capture` executes arbitrary shell commands via `sh -c` and persists captured stdout to disk. That is an unacceptable default surface for any shared or client-hosted deployment model without explicit gating.

**Mitigation Prompt 7:**  
`Harden run_capture before release by adding an explicit enable/disable policy switch, a safer execution strategy than raw sh -c where possible, redaction for likely secrets, and a configurable retention policy or opt-out for persisted logs. Document the resulting trust model clearly in README.md and docs/GUIDE.md.`

#### Risk 2

**High — `src/mcp/server.ts:128-132`, `src/mcp/repo-state.ts:52-235`**  
Every tool invocation triggers synchronous git-backed repo observation. That is a scaling and latency risk for larger repos and a blocker for the planned system-wide daemon direction.

**Mitigation Prompt 8:**  
`Move repo observation off the hot request path by introducing an injected git-execution seam, bounded async execution, and caching/debouncing around repeated state reads. Preserve the layered-worldline semantics, but prevent a slow git command from stalling every MCP request.`

#### Risk 3

**High — dependency chain (`pnpm audit --json` on 2026-04-07)**  
The resolved Vite version under Vitest is `8.0.3`, and the current audit reports `GHSA-v2wj-q39q-566r`, `GHSA-p9ff-h696-f583`, and `GHSA-4w7w-66w2-5vf9`.

**Mitigation Prompt 9:**  
`Update the Vitest/Vite dependency chain so the resolved Vite version is 8.0.5 or later, verify the lockfile state, rerun pnpm test plus pnpm audit --json, and note any breaking changes or pin overrides needed to keep CI green.`

### 2.2 Security Posture

#### Vulnerability 1

`run_capture` uses `execFileSync("sh", ["-c", command], ...)` in `src/mcp/tools/run-capture.ts`. If the tool is exposed in a broader deployment model, that is effectively an arbitrary command execution surface with only social, not technical, containment.

**Mitigation Prompt 10:**  
`Replace the current raw sh -c execution model in run_capture with an explicitly governed execution layer: require feature gating, validate or constrain commands where possible, and document the trust assumptions for local-only versus shared-service deployments.`

#### Vulnerability 2

`run_capture` writes full shell output to `.graft/logs/capture.log` with no redaction or retention policy. That can persist secrets or environment-derived data longer than intended.

**Mitigation Prompt 11:**  
`Add redaction and retention controls to run_capture logging. At minimum, support disabling persistence, redact obvious secret patterns before writing, and add tests that prove sensitive-looking output is not stored verbatim in .graft/logs/capture.log.`

### 2.3 Operational Gaps

#### Gap 1

No durable, structured runtime logging or trace correlation exists for the MCP server beyond in-memory receipts and metrics.

#### Gap 2

There is no release-time dependency/security gate in the normal development flow; the Vite findings were caught by manual audit, not by an enforced release step.

#### Gap 3

The future shared-daemon direction still lacks an explicit operational model for authentication, authorization, and resource isolation across concurrent clients and repos.

## 3. Final Recommendations & Next Step

### 3.1 Final Ship Recommendation

**YES, BUT...**

Ship it as a **local-first agent tool** with clear scope boundaries. Do **not** market or deploy it yet as a hardened shared service or system-wide default daemon until the shell surface and synchronous repo observation are tightened.

### 3.2 Prioritized Action Plan

- **Action 1 (High Urgency):** Update the Vite dependency chain to eliminate the current advisories.
- **Action 2 (High Urgency):** Harden `run_capture` with execution gating, redaction, and retention controls.
- **Action 3 (Medium Urgency):** Introduce an injected Git/Shell execution seam and remove synchronous repo observation from the hot request path.
