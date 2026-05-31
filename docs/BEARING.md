# BEARING

Current direction and active tensions. Historical ship data is in `CHANGELOG.md`.

```mermaid
timeline
    Phase 1 : Daemon Substrate : Hexagonal Ports : Async Git/FS
    Phase 2 : WARP Ontology : Causal Collapse : Strands/Worldlines
    Phase 3 : Multi-Repo Coordination : Resource Fairness : Scenario Replay
```

## Active Gravity

### 1. Structural History Schema and Echo Migration
- Graft defines canonical structural history facts in GraphQL.
- Graft consumes the existing Wesley toolchain to derive TypeScript read
  models, validators, Echo-consumable contracts, SQL/storage artifacts, and
  drift witnesses from that schema.
- Echo becomes the primary causal-history substrate for Graft's structural
  history after parity is proven.
- git-warp is demoted to provenance-preserving legacy import and temporary
  fallback compatibility.
- Evidence labels distinguish `echo-native`, `git-warp-imported`, and
  `fallback-translated` facts.
- The landed `StructuralReadingPort` remains the Graft-facing read boundary,
  but its hand-authored payloads are transitional.

### 2. Entrypoint Convergence
- Formalizing API, CLI, and MCP as equal first-class entry points.
- Extracting application services so those three surfaces stop owning
  business flow.
- Establishing baseline capability posture and parity expectations
  before more surface growth lands.

### 3. WARP Ontology & Causal Collapse
- Explicit definition of session, strand, and checkout epoch.
- Implementation of strand-aware causal collapse (admission of speculative work into canonical history).
- Strengthening of symbol identity and rename continuity for precise slicing.
- Migration from whole-graph read patterns (`getEdges()`, `getNodes()`) to
  slice-first reads (`traverse`, `QueryBuilder`, tick receipts). The highest-risk
  WARP reference and precision paths have been mitigated; medium-severity
  local-history and newer structural-metric reads remain tracked.

### 4. Multi-Repo Coordination
- Refinement of the Shared Daemon trust boundaries.
- System-wide resource pressure and fairness summaries across multiple repos.
- Authorization-filtered multi-repo overview surfaces.

### 5. Agentic Observability
- Implementation of the Deterministic Scenario Replay pipeline.
- Machine-readable between-commit activity views for agents and humans.

## Tensions

- **Daemon Authz Isolation**: Ensuring that transport-scoped sessions cannot "hop" to unauthorized workspace slices via ID guessing.
- **git-warp Substrate Strain**: Very large histories and ref sets push
  git-warp through Git performance limits; Graft should move normal operation
  to Echo after schema-backed parity rather than hand-translating git-warp's
  graph model into Echo.
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
`v0.8.0` shipped Review Truth: structural PR summaries, provenance
signals, symbol history, removed-symbol evidence, structural
test-reference signals, review readiness, and broader language/config
parsing.

## Next Target

The immediate focus is **schema authority before substrate migration**.

1. Keep `main` clean after the `v0.8.0` release.
2. Treat the Wesley-backed structural-history generation gate as the active
   quality invariant: generated TypeScript must be regenerated from GraphQL in
   CI through the pinned Wesley CLI.
3. Pull
   [CORE_structural-history-schema-and-echo-migration](./method/backlog/up-next/CORE_structural-history-schema-and-echo-migration.md)
   as the next design/implementation cycle.
4. Define Graft's canonical structural history facts in GraphQL before
   adapting more git-warp output.
5. Use the existing Wesley toolchain to derive the TypeScript/Zod read model,
   Echo-consumable contracts, storage artifacts, and drift witnesses from that
   schema.
6. Preserve current public command behavior while validating Echo-backed
   outputs against git-warp-backed outputs.
7. Treat git-warp evidence as `git-warp-imported` or `fallback-translated`,
   never as Continuum-native witnesshood.
8. Stop opening git-warp during normal Graft operation once parity is proven.
9. Do not add METHOD-specific backlog/status features to Graft. METHOD
   backlog lanes, cards, retros, dependency DAGs, and release truth
   surfaces belong in Method MCP / Method CLI.
10. Keep `WARP_lsp-enrichment` and `CORE_migrate-to-slice-first-reads`
   out of this slice. LSP enrichment remains valid optional scope;
   slice-first reads remain externally blocked until git-warp observer
   geometry APIs land.
11. Treat daemon live refresh and daemon control-plane actions as a
   separate daemon-operator lane, not part of this slice.
