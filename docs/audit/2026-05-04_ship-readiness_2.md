---
report_id: "AUD-2026-05-04-S-V02"
title: "Quarterly Ship Readiness Audit: Graft Governor"
status: "Final"
audit:
  date_started: 2026-05-04
  date_completed: 2026-05-04
  type: "Full"
  scope: "src/warp/*, src/parser/*, test/*"
  compliance_frameworks: ["Production Readiness Standards"]
target:
  repository: "github.com/flyingrobots/graft"
  branch: "main"
  commit_hash: "HEAD"
  language_stack: ["TypeScript 6.0", "Docker"]
  environment: "Production-Mirror"
methodology:
  automated_tools: ["Vitest", "ESLint"]
  manual_review_hours: 4
  false_positive_rate: "5%"
summary:
  total_findings: 11
  severity_count:
    critical: 0
    high: 2
    medium: 5
    low: 4
  remediation_status: "Pending"
related_reports:
  previous_audit: "AUD-2026-05-04-S-V01"
---

<!-- markdownlint-disable -->

# CODEBASE AUDIT: READY-TO-SHIP ASSESSMENT (EXHAUSTIVE MODE)

### 1. QUALITY & MAINTAINABILITY ASSESSMENT (EXHAUSTIVE)

1.1. **Technical Debt Score (1-10):** 4.
**Justification:** The core logic is sound, but the "WARP" structural indexing layer has several patterns that hinder maintainability:
1. **Implicit Dependencies**: `index-head.ts` relies on Git CLI availability and specific output formats without robust version checks.
2. **Brittle Type Casting**: `symbol-timeline.ts` uses `as unknown as` to access internal interfaces, indicating a leaking abstraction.
3. **Performance Overhead**: Indexing uses full JSON serialization for size budgeting.

1.2. **Readability & Consistency:**
* **Issue 1:** The "lamport" clock logic in `index-head.ts` is used without clear documentation on its role in tie-breaking or causal ordering within the graph.
* **Mitigation Prompt 1:** `Add inline documentation and a JSDoc block to the lamport clock usage in src/warp/index-head.ts explaining its role in the WARP worldline model.`
* **Issue 2:** Constant `DEFAULT_INDEX_MAX_PATCH_JSON_BYTES` is defined in `index-head.ts` but is not exposed to the CLI, making it "magical" and hard to tune for users.
* **Mitigation Prompt 2:** `Expose the max-patch-size limit as a configurable flag in the 'graft index' command and update src/warp/index-head.ts to respect this override.`
* **Issue 3:** Error messages in `ast-emitter.ts` (if any) are not standardized with the `CliError` format used in the primary CLI surface.
* **Mitigation Prompt 3:** `Standardize error reporting in src/warp/ast-emitter.ts to use the CliError details pattern for consistent terminal output.`

1.3. **Code Quality Violation:**
* **Violation 1:** `indexHeadFile` in `src/warp/index-head.ts` is a 100+ line function that manages Git, Tree-Sitter, Graph Patching, and Semantic Enrichment in a single procedural block.
* **Simplified Rewrite 1:**
```typescript
async function indexHeadFile(input) {
  const content = await fetchGitContent(input);
  const tree = await parseTree(content, input);
  const semantic = await getSemanticFacts(content, input);
  return patchHeadGraph(tree, semantic, input);
}
```
* **Mitigation Prompt 4:** `Refactor indexHeadFile into a smaller, functional pipeline using the fetch-parse-enrich-patch pattern.`
* **Violation 2:** `symbol-timeline.ts` uses string manipulation (`symId.slice("sym:".length)`) to extract file paths, which is fragile if the ID format changes.
* **Simplified Rewrite 2:**
```typescript
function parseSymId(id) {
  const { filePath, symbolName } = symIdCodec.decode(id);
  return filePath;
}
```
* **Mitigation Prompt 5:** `Introduce a 'SymIdCodec' utility in src/warp/ to centralize the encoding and decoding of symbol IDs, replacing all manual string slicing.`
* **Violation 3:** `indexHead` uses `listTrackedFiles` which calls `ls-files` without any pagination or streaming, risking memory exhaustion in massive repositories.
* **Simplified Rewrite 3:**
```typescript
async function* streamTrackedFiles(cwd, git) {
  // Use a streaming Git client approach
}
```
* **Mitigation Prompt 6:** `Refactor listTrackedFiles in index-head.ts to return an AsyncGenerator that streams file paths, reducing peak memory usage during whole-repo indexing.`

### 2. PRODUCTION READINESS & RISK ASSESSMENT (EXHAUSTIVE)

2.1. **Top 3 Immediate Ship-Stopping Risks (The "Hard No"):**
* **Risk 1:** **Top-level await in `src/parser/runtime.ts`**. This can cause the entire application to hang indefinitely if the WASM files are missing or the environment (e.g., an older Node version) doesn't support the load. (High, `src/parser/runtime.ts`)
* **Mitigation Prompt 7:** `Refactor src/parser/runtime.ts to use a lazy-loading pattern for Tree-Sitter grammars, ensuring that the application can start even if parsing is not yet ready.`
* **Risk 2:** **Lack of Git Version Guardrail**. Graft relies on modern Git plumbing flags (like `--path-format`). Running on an old Git version will cause cryptic failures. (High, `src/ports/git.ts`)
* **Mitigation Prompt 8:** `Add a 'git --version' check to the startup sequence in src/index.ts that warns or fails if the Git version is below the minimum required for WARP operations.`
* **Risk 3:** **Synchronous `JSON.stringify` on large patches**. This blocks the event loop for every file indexed, which will cause the Daemon to be unresponsive during large indexing jobs. (Medium, `src/warp/index-head.ts`)
* **Mitigation Prompt 9:** `Replace synchronous JSON.stringify with an incremental size estimator or offload patch serialization to a worker thread.`

2.2. **Security Posture:**
* **Vulnerability 1:** `git show HEAD:path` in `indexHeadFile` doesn't explicitly sanitize the `path` argument against potential shell injection or path escape if called with untrusted input (though it's currently used with `ls-files` output).
* **Mitigation Prompt 10:** `Verify that all Git operations in src/warp/index-head.ts use a 'safePath' wrapper that prevents command injection or repository escape.`
* **Vulnerability 2:** Semantic providers might execute arbitrary code if they are configured via external plugins.
* **Mitigation Prompt 11:** `Implement a basic sandbox or strict validation for any external SemanticEnrichmentProvider that is not part of the core Graft package.`

2.3. **Operational Gaps:**
* **Gap 1:** No "Batch Index" command. The current `indexHead` is limited to 64 files, making it hard to index a large repo for the first time.
* **Gap 2:** No "Warp Health" check. `doctor` reports on the basic runtime but doesn't verify the integrity of the WARP graph or the staleness of the index.
* **Gap 3:** No resource limit for the WARP pool. `InMemoryWarpPool` could grow indefinitely if many repositories are opened.

### 3. FINAL RECOMMENDATIONS & NEXT STEP

3.1. **Final Ship Recommendation:** **YES, BUT...** with the caveat that large-repo performance and cold-start reliability must be addressed.

3.2. **Prioritized Action Plan:**
* **Action 1 (High Urgency):** Refactor `parser/runtime.ts` to remove top-level await and implement lazy grammar loading.
* **Action 2 (High Urgency):** Implement a Git version check at startup.
* **Action 3 (Medium Urgency):** Decompose `indexHeadFile` to improve indexing maintainability.
