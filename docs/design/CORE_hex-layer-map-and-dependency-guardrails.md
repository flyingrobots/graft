---
title: "hex layer map and dependency guardrails"
legend: "CORE"
cycle: "CORE_hex-layer-map-and-dependency-guardrails"
source_backlog: "docs/method/backlog/asap/CORE_hex-layer-map-and-dependency-guardrails.md"
---

# hex layer map and dependency guardrails

Source backlog item: `docs/method/backlog/asap/CORE_hex-layer-map-and-dependency-guardrails.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

Land a truthful, mechanically enforced first-cut layer map for Graft so
future architecture work cannot silently regress while the repo is still
mid-migration.

This slice is complete when:

- the repo names the current enforceable layers instead of claiming a
  finished hex topology
- contracts, ports, current application modules, and current secondary
  adapters have static import-direction guardrails
- the guardrails pass on repo truth today
- a repo-visible playback witness proves the lint rules reject concrete
  bad imports on each protected layer

## Playback Questions

### Human

- [ ] Can a human point to the currently enforced layers without having
      to infer them from code archaeology?
- [ ] Is it explicit that this cycle enforces a truthful first-cut map,
      not a final directory reorganization?
- [ ] Does `ARCHITECTURE.md` stop claiming the repo is already strict
      hexagonal in full?

### Agent

- [ ] Do contracts and pure helpers reject imports from ports,
      application modules, secondary adapters, primary adapters, and
      host libraries?
- [ ] Do ports reject imports from application modules, adapters,
      primary adapters, and host libraries?
- [ ] Do current application modules reject direct adapter and host
      imports?
- [ ] Do current secondary adapters reject imports from primary
      adapters?
- [ ] Does the playback witness prove the guardrails by linting
      synthetic violations rather than relying on prose claims?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - one guarded layer family at a time
  - plain language import-direction rules
  - repo-visible witness instead of diagram-only proof
- Non-visual or alternate-reading expectations:
  - every rule must be legible as text
  - no graph or tree view is required to understand the guardrails

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - layer names are code-oriented ASCII labels
  - "primary adapter" means CLI, MCP, or hooks in the current repo
- Logical direction / layout assumptions:
  - dependency direction is part of repo truth
  - forbidden imports are enforced mechanically through lint

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - which globs count as foundational contracts/pure helpers
  - which globs count as ports
  - which globs count as current application modules
  - which globs count as current secondary adapters
- What must be attributable, evidenced, or governed:
  - architecture claims must match current code posture
  - new boundary rules must fail concretely on forbidden imports
  - any unguarded mixed-layer directory must be treated as follow-up
    debt, not hidden inside the first slice

## Non-goals

- [ ] Create a final `src/application/**` directory in this cycle.
- [ ] Reclassify every top-level directory before enforcing anything.
- [ ] Make CLI or MCP thin composition roots in the same slice.
- [ ] Finish the WARP port extraction in the same slice.
- [ ] Pretend mixed directories like `src/git/` and `src/metrics/`
      already have perfect layer separation.

## Backlog Context

Define the target module layering for Graft and enforce it mechanically. Settle the allowed dependency directions between contracts, application/use-case services, ports, adapters, and entrypoints, then add static guardrails so future work cannot quietly regress the architecture.

## Current enforced layer map

This slice enforces the layer map that is already truthful in the repo
today:

1. Foundational contracts and pure helpers
   - `src/contracts/**`
   - `src/guards/**`
   - `src/format/**`
   - `src/metrics/types.ts`
   - `src/release/security-gate.ts`
2. Ports
   - `src/ports/**`
3. Current application modules
   - `src/operations/**`
   - `src/parser/**` (structural analysis — application-core domain service)
   - `src/policy/**`
   - `src/session/**`
   - `src/git/diff.ts`
4. Current secondary adapters
   - `src/adapters/**`
   - `src/warp/**`
   - `src/git/target-git-hook-bootstrap.ts`
   - `src/metrics/logger.ts`
5. Primary adapters and entrypoints
   - `src/cli/**`
   - `src/mcp/**`
   - `src/hooks/**`

## Guardrails delivered

The lint rules enforce these directions:

- foundational contracts/pure helpers cannot depend on ports,
  application modules, secondary adapters, primary adapters, or host
  libraries
- ports cannot depend on application modules, secondary adapters,
  primary adapters, or host libraries
- current application modules cannot depend on secondary adapters,
  primary adapters, or host libraries
- current secondary adapters cannot depend on primary adapters

Parser modules are now classified as application modules (Layer 3). The
parser provides structural analysis services consumed by operations.
parser/runtime.ts has a scoped host library exception for WASM loading.

## Follow-on pressure discovered while implementing

The repo still has mixed directories that are too coarse for perfect
directory-level enforcement, especially `src/git/` and `src/metrics/`.
It also still has cross-cutting parser modules that are not yet cleanly
classified as either application or adapter infrastructure. This cycle
does not hide that. It enforces the truthful first-cut globs now and
leaves topology cleanup for follow-on architecture slices.

Recorded follow-up backlog:

- `docs/method/backlog/bad-code/CLEAN_top-level-directories-mix-hex-layers-and-force-file-level-guardrails.md`
- `docs/method/backlog/bad-code/CLEAN_parser-layer-role-is-architecturally-ambiguous.md`
