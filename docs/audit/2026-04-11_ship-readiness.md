# AUDIT: READY-TO-SHIP ASSESSMENT (2026-04-11)

### 1. QUALITY & MAINTAINABILITY ASSESSMENT (EXHAUSTIVE)

1.1. **Technical Debt Score (1-10):** 4
    - **Justification:**
        1. **God Module (`workspace-router.ts`)**: Manages too many disparate concerns (Authz, Causal History, Path Resolution, Session Slicing).
        2. **Infrastructure Coupling in Server**: `server.ts` is coupled to daemon-specific implementation details like the worker pool and job scheduler.
        3. **Git Subprocess Churn**: Frequent spawning of `git` for repo state observation can impact latency in large repos.

1.2. **Readability & Consistency:**
    - **Issue 1:** `AsyncLocalStorage` usage in `server.ts` is clever but creates a "magic context" that is hard to trace during debugging.
    - **Mitigation Prompt 1:** `Refactor 'invokeTool' to explicitly pass the execution context to the tool handlers, reducing the reliance on ambient AsyncLocalStorage for core logic.`
    - **Issue 2:** Error codes are a mix of `UNBOUND_SESSION`, `CAPABILITY_DENIED`, and reason codes like `SESSION_CAP`.
    - **Mitigation Prompt 2:** `Rationalize the error taxonomy: Distinguish between 'Runtime Failures' (exceptions), 'Policy Refusals' (reason codes), and 'Protocol Errors' (authz/binding).`
    - **Issue 3:** The `Warp` integration is described as "Level 1" in docs but many features are referenced as "future work" without clear `TODO` markers in code.
    - **Mitigation Prompt 3:** `Audit the 'src/warp' directory and add explicit @deprecated or @experimental tags to features that are waiting for upstream 'git-warp' support.`

1.3. **Code Quality Violation:**
    - **Violation 1: SRP (`WorkspaceRouter`)**: It resolves workspace requests and also manages the persisted local history summary.
    - **Violation 2: SRP (`createGraftServer`)**: This factory function is 150+ lines and constructs the entire runtime tree.
    - **Violation 3: SoC (`RepoStateTracker`)**: It parses reflogs and status outputs while also being responsible for "semantic transition" interpretation.

### 2. PRODUCTION READINESS & RISK ASSESSMENT (EXHAUSTIVE)

2.1. **Top 3 Immediate Ship-Stopping Risks (The "Hard No"):**
    - **Risk 1: Daemon Authz Isolation (High)**: Ensure that a compromised session cannot "hop" to an authorized workspace of another session via ID guessing.
    - **Mitigation Prompt 7:** `Implement a 'Session Secret' or HMAC-based binding token that must be presented with every tool call in daemon mode to verify the session-workspace link.`
    - **Risk 2: Large-File Parsing Memory Spike (Medium)**: Tree-sitter parsing of very large files (e.g. 5MB JSON) could cause the worker process to exceed memory limits.
    - **Mitigation Prompt 8:** `Add a 'soft memory limit' to the worker pool and ensure safe_read checks file size BEFORE attempting to parse the full outline.`
    - **Risk 3: Git Lock Contention (Low)**: Concurrent monitors indexing the same repo could hit `.git/index.lock` contention.
    - **Mitigation Prompt 9:** `Implement a 'Repo Lock' in the DaemonJobScheduler that ensures only one background indexing job runs per canonical repo ID.`

2.2. **Security Posture:**
    - **Vulnerability 1: Path Traversal**: `resolvePath` needs to be rigorously tested to ensure `..` segments cannot escape the worktree root.
    - **Mitigation Prompt 10:** `Add an invariant test suite for 'getPathResolver' that attempts to escape the root via symlinks and relative path maneuvers.`
    - **Vulnerability 2: Sensitive Log Persistence**: `mcp-runtime.ndjson` might accidentally capture sensitive arguments if `sanitizeArgKeys` is not exhaustive.
    - **Mitigation Prompt 11:** `Refine 'sanitizeArgKeys' to use a denylist of common secret-bearing keys (e.g., 'apiKey', 'token', 'pass') and truncate any string argument exceeding 1024 bytes in the logs.`

2.3. **Operational Gaps:**
    - **Gap 1: Daemon Supervisor**: No built-in way to auto-restart the daemon if it crashes.
    - **Gap 2: Telemetry Exporter**: No path to export burden metrics to OpenTelemetry or similar.
    - **Gap 3: Resource Quotas**: No per-workspace or per-user CPU/Memory caps in the worker pool.

### 3. FINAL RECOMMENDATIONS & NEXT STEP

3.1. **Final Ship Recommendation:** **YES, BUT...** (Conduct the Authz Security Audit immediately).

3.2. **Prioritized Action Plan:**
    - **Action 1 (High Urgency):** Audit session isolation in `WorkspaceRouter`.
    - **Action 2 (Medium Urgency):** Decompose the `createGraftServer` construction logic.
    - **Action 3 (Low Urgency):** Implement RepoState debouncing to reduce Git overhead.
