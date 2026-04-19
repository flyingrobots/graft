# AUDIT: CODE QUALITY (2026-04-11)

## 0. 🏆 EXECUTIVE REPORT CARD (Strategic Lead View)

|**Metric**|**Score (1-10)**|**Recommendation**|
|---|---|---|
|**Developer Experience (DX)**|8.0|**Best of:** Precise, reason-coded policy refusals.|
|**Internal Quality (IQ)**|8.5|**Watch Out For:** `workspace-router.ts` complexity sprawl.|
|**Overall Recommendation**|**THUMBS UP**|**Justification:** Exceptionally strong domain model (Worldlines/Strands) applied to a difficult problem space (Context Governance).|

---

## 1. DX: ERGONOMICS & INTERFACE CLARITY (Advocate View)

- **1.1. Time-to-Value (TTV) Score (1-10):** 7
    - **Answer:** Fast for Claude Code (hooks), but manual MCP setup for other editors requires multiple configuration steps and understanding of the `workspace_bind` mechanic in daemon mode.
    - **Action Prompt (TTV Improvement):** `Refactor the 'init' command to generate a 'project-local bootstrap script' that non-Claude editors can run to auto-discover and bind the active workspace in one step.`

- **1.2. Principle of Least Astonishment (POLA):**
    - **Answer:** `safe_read` returning an `outline` instead of `content` based on internal budget/cap logic can surprise agents who aren't parsing the `projection` metadata.
    - **Action Prompt (Interface Refactoring):** `Update the 'safe_read' tool definition to include a 'forceContent' flag, and ensure the refusal reason 'SESSION_CAP' includes a suggested next step to use 'read_range'.`

- **1.3. Error Usability:**
    - **Answer:** `WorkspaceBindingRequiredError` is diagnostic but prevents any tool use until a stateful binding event occurs, which is non-standard for traditional stateless MCP tools.
    - **Action Prompt (Error Handling Fix):** `Implement 'implicit_bind' for the daemon: if a tool is called with a path and no active binding exists, attempts to auto-resolve the worktree root and bind the session before failing.`

---

## 2. DX: DOCUMENTATION & EXTENDABILITY (Advocate View)

- **2.1. Documentation Gap:**
    - **Answer:** Guidance on "Causal Provenance" and how to use `causal_status` / `causal_attach` for multi-session handoff is thin.
    - **Action Prompt (Documentation Creation):** `Create 'docs/strategy/causal-provenance.md' explaining the strand-based history model and how human/agent handoff works via the causal attachment seams.`

- **2.2. Customization Score (1-10):** 8
    - **Answer:** Hexagonal ports for FS and Git make it highly extendable. The weakest point is the hardcoded policy logic in `evaluate.ts`.
    - **Action Prompt (Extension Improvement):** `Introduce a 'PolicyProvider' port that allows workspaces to inject custom refusal logic (e.g., project-specific PII scanners) beyond simple .graftignore patterns.`

---

## 3. INTERNAL QUALITY: ARCHITECTURE & MAINTAINABILITY (Architect View)

- **3.1. Technical Debt Hotspot:**
    - **Answer:** `src/mcp/workspace-router.ts`. It manages session slices, binding lifecycle, repo state observation, and causal context orchestration.
    - **Action Prompt (Debt Reduction):** `Decompose 'workspace-router.ts' by extracting the 'SliceManager' (metrics/cache/session tracking) and 'CausalOrchestrator' into dedicated modules.`

- **3.2. Abstraction Violation:**
    - **Answer:** `server.ts` handles tool registration and also contains low-level daemon infrastructure setup (scheduler, worker pool).
    - **Action Prompt (SoC Refactoring):** `Extract daemon infrastructure setup from 'server.ts' into a 'DaemonHost' class, leaving 'server.ts' dedicated to tool registration and request routing.`

- **3.3. Testability Barrier:**
    - **Answer:** Integration tests for the daemon mode require real Unix sockets/named pipes and filesystem state.
    - **Action Prompt (Testability Improvement):** `Implement an 'InProcessDaemonTransport' for tests that allows verifying daemon authz and workspace binding logic without creating physical sockets or subprocesses.`

---

## 4. INTERNAL QUALITY: RISK & EFFICIENCY (Auditor View)

- **4.1. The Critical Flaw:**
    - **Answer:** Daemon Authz bypass. If a client guesses a `sliceId` or session ID, they might be able to access unauthorized workspace slices if the `AsyncLocalStorage` is not perfectly isolated across transport boundaries.
    - **Action Prompt (Risk Mitigation):** `Perform a security audit of 'workspace-router.ts' to ensure that every tool call explicitly verifies the 'transportSessionId' against the requested 'workspaceSliceId'.`

- **4.2. Efficiency Sink:**
    - **Answer:** `RepoStateTracker.observe()` spawns multiple Git subprocesses on every tool call to detect transitions and dirty states.
    - **Action Prompt (Optimization):** `Implement 'RepoState Debouncing': only re-run Git status/reflog if a minimum duration (e.g. 500ms) has passed or if a 'write' operation was detected.`

- **4.3. Dependency Health:**
    - **Answer:** Good. Uses `@git-stunts/git-warp` and `@git-stunts/plumbing` which are peer projects with high alignment.
    - **Action Prompt (Dependency Update):** `Align all @git-stunts peer dependencies to the latest stable versions to ensure compatibility with the upcoming strand-aware causal collapse features.`

---

## 5. STRATEGIC SYNTHESIS & ACTION PLAN (Strategist View)

- **5.1. Combined Health Score (1-10):** 8.5
- **5.2. Strategic Fix:** **Daemon Infrastructure Decomposition**. Moving management of workers, schedulers, and authz out of the main server module improves both maintainability and security auditing.
- **5.3. Mitigation Prompt:**
    - **Action Prompt (Strategic Priority):** `Refactor 'src/mcp/server.ts' to delegate all daemon-specific infrastructure (scheduler, worker pool, monitor runtime) to a new 'DaemonRuntime' container. This clarifies the boundary between the tool-registry and the execution authority.`
