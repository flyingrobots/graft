# Audit 1: Code Quality

**Date:** 2026-04-07  
**Codebase type:** agent-first developer tooling package (`@flyingrobots/graft`) with MCP, CLI, hooks, and WARP-backed structural history.

## 0. Executive Report Card

| Metric | Score (1-10) | Recommendation |
|---|---:|---|
| **Developer Experience (DX)** | **8** | **Best of:** the surface is now much more coherent: one-step `init`, grouped CLI peers, and explicit `serve` make the operator path legible. |
| **Internal Quality (IQ)** | **6** | **Watch Out For:** synchronous `git` and shell execution still sit on hot request paths and in orchestration hotspots such as `src/mcp/repo-state.ts` and `src/warp/indexer.ts`. |
| **Overall Recommendation** | **THUMBS UP** | **Justification:** Graft is a real, usable product today, but its next failures will come from orchestration coupling and operational hardening rather than missing core features. |

## 1. DX: Ergonomics & Interface Clarity

### 1.1 Time-to-Value (TTV) Score: 8/10

- **Answer:** The single biggest remaining setup/boilerplate cost is that `graft init` now writes project-local Claude/Codex config directly, but other documented clients still require manual JSON copying from `docs/GUIDE.md`. That means the README promise of broad MCP-client support is real, but the shortest path still depends on which client the operator happens to use.
- **Action Prompt (TTV Improvement):**  
  `Extend graft init so it can generate or write project-local MCP config for the other documented clients (Cursor, Windsurf, Continue, Cline) through explicit, opt-in flags or client profiles. Preserve the current conservative default, keep all writes idempotent, add tests for merge behavior where files already exist, and update README.md plus docs/GUIDE.md so each supported client has a one-step bootstrap command instead of a copy-paste-only path.`

### 1.2 Principle of Least Astonishment (POLA)

- **Answer:** The biggest remaining POLA violation is the hidden no-arg non-interactive compatibility shim in `bin/graft.js` plus `resolveEntrypointArgs()` in `src/cli/main.ts`. A human now sees help on bare `graft`, but a non-interactive caller with no args still gets transport startup. That is defensible for compatibility, but the public behavior still varies based on TTY state rather than explicit intent. A developer would intuitively expect `graft serve` to be the only server-start path.
- **Action Prompt (Interface Refactoring):**  
  `Refactor the package entrypoint so transport startup is fully explicit: keep graft serve as the only documented and primary stdio startup path, replace the current TTY-based compatibility heuristic with a narrower transition strategy (for example an environment-gated fallback or a deprecation window), add regression tests for interactive and non-interactive launch modes, and update docs to explain the cutover clearly.`

### 1.3 Error Usability

- **Answer:** CLI errors in `src/cli/main.ts` still degrade to bare messages such as `Error: Unknown command: ...` or `Error: Missing value for --end`, with no nearby command usage or doc pointer. This is technically correct but not diagnostic enough for a first-time operator.
- **Action Prompt (Error Handling Fix):**  
  `Upgrade src/cli/main.ts so command parsing failures return command-scoped help, one concrete next step, and a stable documentation pointer into docs/GUIDE.md. Preserve JSON behavior for machine-readable paths, but make human-facing stderr errors explain what command the user likely meant and how to inspect the grouped CLI surface.`

## 2. DX: Documentation & Extendability

### 2.1 Documentation Gap

- **Answer:** The single most important missing piece of content is a dedicated architecture reference that explains how CLI, MCP, hooks, policy evaluation, and WARP fit together. `README.md`, `docs/GUIDE.md`, `docs/BEARING.md`, and `METHOD.md` each cover part of the story, but a contributor who wants to move beyond basic usage still has to reconstruct the actual system boundaries from code.
- **Action Prompt (Documentation Creation):**  
  `Create a new top-level ARCHITECTURE.md that explains the runtime surfaces (CLI, MCP, hooks), the shared policy seam, the layered worldline model, and the WARP write/read split. Include a short request-flow walkthrough, a module map for the main source directories, and links back to README.md, docs/GUIDE.md, docs/BEARING.md, and METHOD.md.`

### 2.2 Customization Score: 5/10

- **Answer:** The strongest extension point is `.graftignore`, because operators can meaningfully change policy scope without source changes. The weakest extension point is policy behavior itself: thresholds, runtime profiles, and shell-surface posture are still hard-coded or implicitly encoded in modules such as `src/policy/evaluate.ts`, `src/mcp/tools/run-capture.ts`, and `src/mcp/server.ts`, which means meaningful customization still requires code edits.
- **Action Prompt (Extension Improvement):**  
  `Introduce a first-class policy profile/config object that externalizes thresholds, shell-surface posture, and future transport/runtime toggles while preserving current defaults. Route MCP, CLI, and hooks through that profile so operators can customize the policy contract without editing source files.`

## 3. Internal Quality: Architecture & Maintainability

### 3.1 Technical Debt Hotspot

- **Answer:** `src/warp/indexer.ts` is still the single densest technical-debt hotspot. It owns git history reads, commit metadata collection, diff parsing, directory/file/symbol graph writes, child-diff application, and performance-sensitive materialization decisions in one file. That is high coupling, mixed levels of abstraction, and low cohesion concentrated in the same module.
- **Action Prompt (Debt Reduction):**  
  `Incrementally refactor src/warp/indexer.ts into smaller collaborators: a git-history reader, a structural patch builder, and a graph-write coordinator. Keep indexCommits() as the stable public entrypoint, but move commit enumeration, metadata loading, and patch application into isolated units with focused tests.`

### 3.2 Abstraction Violation

- **Answer:** `src/mcp/repo-state.ts` most clearly violates separation of concerns. It shells out to git, normalizes porcelain output, infers semantic transitions, computes workspace overlay summaries, and acts as the MCP-facing state tracker. The code is readable, but it still mixes environment observation with domain interpretation.
- **Action Prompt (SoC Refactoring):**  
  `Extract git observation from src/mcp/repo-state.ts into a dedicated adapter or repository layer, move transition classification into a separate service, and keep RepoStateTracker focused on composing typed observations from already-captured repo facts.`

### 3.3 Testability Barrier

- **Answer:** The biggest testability barrier remains direct synchronous process execution in core/request-path code. `bin/graft.js`, `src/mcp/repo-state.ts`, `src/warp/indexer.ts`, `src/git/diff.ts`, and `src/mcp/tools/run-capture.ts` all rely on `execFileSync`, which forces tests to either spawn real subprocesses or build elaborate temp-repo scaffolding.
- **Action Prompt (Testability Improvement):**  
  `Introduce an injected Git/Shell execution port with production and fake implementations, migrate the execFileSync call sites onto that seam, and add unit tests that exercise repo-state, indexer, diff, and shell-capture behavior without spawning real subprocesses.`

## 4. Internal Quality: Risk & Efficiency

### 4.1 The Critical Flaw

- **Answer:** The most severe hidden risk is that `run_capture` in `src/mcp/tools/run-capture.ts` executes arbitrary shell commands through `sh -c` and persists full stdout to `.graft/logs/capture.log` without redaction or retention policy. That may be acceptable as a local escape hatch, but it is a material hardening gap for any shared or system-wide deployment story.
- **Action Prompt (Risk Mitigation):**  
  `Harden src/mcp/tools/run-capture.ts by adding explicit execution gating, output redaction hooks for likely secrets, and configurable log retention or opt-out persistence. Preserve the diagnostic escape-hatch role, but make it impossible to treat raw shell capture as an ungoverned default in a shared or production-adjacent environment.`

### 4.2 Efficiency Sink

- **Answer:** The most obvious efficiency sink is WARP indexing’s `core().materialize()` step on commits with removals in `src/warp/indexer.ts`. The code already documents that materialization is expensive and currently pays that cost inline during indexing rather than behind background or incremental strategies.
- **Action Prompt (Optimization):**  
  `Optimize src/warp/indexer.ts so removal-heavy indexing avoids unconditional inline materialize calls. Explore incremental state tracking, commit batching, or a background materialization strategy, and add measurements on representative repos so the new behavior is justified by timing data rather than intuition.`

### 4.3 Dependency Health

- **Answer:** `pnpm audit --json` on 2026-04-07 reports three advisories through `.>vitest>vite` on `vite@8.0.3`: `GHSA-v2wj-q39q-566r` (high), `GHSA-p9ff-h696-f583` (high), and `GHSA-4w7w-66w2-5vf9` (moderate). `pnpm outdated --format json` also shows `web-tree-sitter` is materially behind (`0.20.8` current vs `0.26.8` latest), although the immediate security concern is the Vite chain.
- **Action Prompt (Dependency Update):**  
  `Update the Vitest/Vite dependency chain so the resolved Vite version is 8.0.5 or later, verify whether this requires a Vitest bump, an override, or both, rerun pnpm test plus pnpm audit --json, and document any compatibility changes before merging.`

## 5. Strategic Synthesis & Action Plan

### 5.1 Combined Health Score: 7/10

- **Answer:** Graft is healthy enough to keep shipping as a serious local agent tool, but its main scaling and maintainability risks are now concentrated in orchestration seams rather than in missing product surface.

### 5.2 Strategic Fix

- **Answer:** The highest-leverage move is still an injected Git/Shell execution seam with caching around repo observation. It improves DX by making failures clearer and behavior less flaky, and improves internal quality by reducing coupling across `bin/graft.js`, `src/mcp/repo-state.ts`, `src/warp/indexer.ts`, `src/git/diff.ts`, and `src/mcp/tools/run-capture.ts`.

### 5.3 Mitigation Prompt

- **Action Prompt (Strategic Priority):**  
  `Implement an injected Git/Shell execution seam for Graft. Add a production adapter and a deterministic test fake, migrate bin/graft.js, src/mcp/repo-state.ts, src/warp/indexer.ts, src/git/diff.ts, and src/mcp/tools/run-capture.ts onto that seam, introduce caching/debouncing for repo-state observation on the MCP request path, and improve user-facing error messages where subprocess failures currently bubble up as generic CLI or tool errors.`
