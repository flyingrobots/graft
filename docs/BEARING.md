# BEARING

Current direction and active tensions. Historical ship data is in `CHANGELOG.md`.

```mermaid
timeline
    Phase 1 : Daemon Substrate : Hexagonal Ports : Async Git/FS
    Phase 2 : WARP Ontology : Causal Collapse : Strands/Worldlines
    Phase 3 : Multi-Repo Coordination : Resource Fairness : Scenario Replay
```

## Active Gravity

### 1. Entrypoint Convergence
- Formalizing API, CLI, and MCP as equal first-class entry points.
- Extracting application services so those three surfaces stop owning
  business flow.
- Establishing baseline capability posture and parity expectations
  before more surface growth lands.

### 2. WARP Ontology & Causal Collapse
- Explicit definition of session, strand, and checkout epoch.
- Implementation of strand-aware causal collapse (admission of speculative work into canonical history).
- Strengthening of symbol identity and rename continuity for precise slicing.
- Migration from whole-graph read patterns (`getEdges()`, `getNodes()`) to
  slice-first reads (`traverse`, `QueryBuilder`, tick receipts). The highest-risk
  WARP reference and precision paths have been mitigated; medium-severity
  local-history and newer structural-metric reads remain tracked.

### 3. Multi-Repo Coordination
- Refinement of the Shared Daemon trust boundaries.
- System-wide resource pressure and fairness summaries across multiple repos.
- Authorization-filtered multi-repo overview surfaces.

### 4. Agentic Observability
- Implementation of the Deterministic Scenario Replay pipeline.
- Machine-readable between-commit activity views for agents and humans.

## Tensions

- **Daemon Authz Isolation**: Ensuring that transport-scoped sessions cannot "hop" to unauthorized workspace slices via ID guessing.
- **Git Subprocess Churn**: Frequent spawning of `git` for repo state observation in large repositories impacts latency.
- **Session Semantic Drift**: The term `session` remains too transport-scoped in the code; it needs to move toward a strand-scoped causal envelope.
- **Warp Level 1 Debt**: Some WARP follow-on work is implemented ahead
  of the release bookkeeping that describes it. Release and METHOD
  truth surfaces need to be kept in step with the code.
- **Whole-Graph Read Assumptions**: Remaining read paths in
  local-history, persisted-local-history, and newer WARP structural
  metric helpers still call `getNodes()` / `getEdges()` in bounded or
  medium-risk contexts. git-warp's observer geometry ladder (design
  0035) plans slice-first APIs; graft tracks remaining call sites in
  `CORE_migrate-to-slice-first-reads`.

## Shipped Baseline

`v0.7.0` shipped the WARP, daemon-runtime, daemon-status, git-facing
enhance, governed-edit, path-boundary, and Dockerized validation spine.
`v0.7.1` followed with npm package hygiene: built `dist/` runtime
artifacts, no published `src/`, development-only `tsx`, and release
publish guards.

## Next Target

The immediate focus is **v0.8.0 scope formation**, not feature work.

1. Keep `main` release-clean after `v0.7.1`.
2. Shape `v0.8.0` around operational truth surfaces: backlog/METHOD
   status, health diagnostics, and structural review summaries.
3. Pull `CORE_backlog-status-tool` next as the first scope-forming
   cycle. The goal is a deterministic repo truth model before more
   product surface expands.
4. Recheck `CORE_graft-doctor` after backlog status. The command
   already exists, so the card needs a narrow relevance/scope pass
   before any unified health-report work.
5. Keep `WARP_lsp-enrichment` and `CORE_migrate-to-slice-first-reads`
   out of the opening v0.8.0 lane. LSP enrichment remains valid
   optional scope; slice-first reads remain externally blocked until
   git-warp observer geometry APIs land.
6. Treat daemon live refresh and daemon control-plane actions as a
   separate daemon-operator lane, not the default v0.8.0 spine.
