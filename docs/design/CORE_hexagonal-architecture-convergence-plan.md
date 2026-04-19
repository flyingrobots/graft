---
title: "hexagonal architecture convergence plan"
legend: "CORE"
cycle: "CORE_hexagonal-architecture-convergence-plan"
source_backlog: "docs/method/backlog/asap/CORE_hexagonal-architecture-convergence-plan.md"
---

# hexagonal architecture convergence plan

Source backlog item: `docs/method/backlog/asap/CORE_hexagonal-architecture-convergence-plan.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

Settle an executable convergence plan that moves Graft from a
hexagonal-leaning codebase with strong ports but mixed orchestration
layers into a truthfully strict hexagonal architecture.

The plan must be explicit enough that:

- one application core becomes the only place that owns product
  behavior
- CLI, MCP, hooks, and daemon transport become thin primary adapters
  and composition roots rather than alternate homes for business logic
- filesystem, git, process, codec, and WARP all sit behind explicit
  secondary ports and adapters
- SOLID and DRY pressure is resolved by architecture, not by ad hoc
  cleanup in whichever file currently hurts
- the next execution queue is split into finite backlog slices instead
  of one vague “clean it all up” ambition
- docs stop overclaiming strict hex posture before repo truth earns it

## Playback Questions

### Human

- [ ] Can a human explain the target layer map:
      contracts, application/use cases, ports, secondary adapters, and
      primary adapters/composition roots?
- [ ] Can a human explain what must move out of `src/mcp/` and `src/cli/`
      versus what is allowed to stay at the edge?
- [ ] Is it explicit why `ARCHITECTURE.md` currently overclaims strict
      hexagonal posture?
- [ ] Is the next execution queue concrete enough to choose the next
      architecture slice without re-planning the whole repo?

### Agent

- [ ] Does the packet name the dependency rules tightly enough to
      enforce with tooling rather than taste?
- [ ] Does the packet make the WARP boundary explicit as a first-class
      port/adaptor problem rather than a loose cast problem?
- [ ] Does the packet map the major current hotspots
      (`server.ts`, `workspace-router.ts`, persisted local history,
      repo state, runtime observability, parser/operations hotspots)
      into migration slices instead of leaving them as a complaint list?
- [ ] Does the packet turn the missing architecture slices into real
      backlog items with sequencing, not just prose?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - one layer at a time
  - one rule set for allowed dependencies
  - one migration queue from foundation to cleanup
- Non-visual or alternate-reading expectations:
  - the plan must stand on plain text alone
  - no diagram-only semantics
  - every layer and backlog slice must be readable as prose and by path

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - internal module and path names remain ASCII and code-oriented
  - “hexagonal” is used in the strict architecture sense, not as a vibe
- Logical direction / layout assumptions:
  - dependency direction is semantically important and stated plainly
  - import direction is part of repo truth, not merely documentation

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - which directories are target homes for contracts, use cases, ports,
    adapters, and entrypoints
  - which imports are forbidden across those layers
  - which existing hotspots belong to which migration slice
  - which backlog item is the next lawful move
- What must be attributable, evidenced, or governed:
  - architecture claims in docs must match code truth
  - new dependency rules should be mechanically enforced
  - any exception to the hex boundary should be named as an edge-script
    carve-out, not silently tolerated

## Non-goals

- [ ] Rewrite the entire repo in one cycle.
- [ ] Rename every module or directory purely for aesthetics.
- [ ] Stop product work until the architecture is “perfect.”
- [ ] Re-open settled WARP ontology decisions in the same packet.
- [ ] Pretend hooks or CLI bootstrap code must be pure core logic;
      some edge-specific composition will always remain at the edge.

## Backlog Context

Plan how to move Graft to a strict hexagonal, SOLID, DRY architecture without losing current product velocity. Produce a convergence packet that names the target module boundaries, dependency rules, migration phases, and the backlog slices required to get there.

## Problem framing

Graft already has real ports:

- `FileSystem`
- `JsonCodec`
- `GitClient`
- `ProcessRunner`

That is meaningful progress, but it is not the same thing as having a
strict hexagonal architecture.

Repo truth today is weaker:

- product behavior still lives inside MCP and CLI orchestration modules
- `src/mcp/server.ts` and `src/mcp/workspace-router.ts` remain large
  concentration points
- WARP is still opened directly and narrowed by casting instead of
  entering the system through a first-class port
- command/context/result boundaries still lean on structural records and
  casts in too many places
- the public architecture doc says “strict Hexagonal (Ports and
  Adapters)” before the code fully deserves that claim

This packet does not claim the repo is non-hex. It claims the repo is
mid-migration:

- ports exist
- adapters exist
- application core extraction is incomplete
- dependency rules are not yet fully enforced

## Definition of “100% legit”

Graft is only truthfully “strict hexagonal” when all of the following
are true:

1. Product behavior lives in one application core, not in transport or
   command adapters.
2. Platform dependencies enter through explicit ports.
3. WARP is treated as a secondary adapter behind a first-class graph
   port, not as an ambient capability.
4. CLI, MCP, hook scripts, and daemon transport are thin primary
   adapters and composition roots.
5. Dependency rules are enforced mechanically, not socially.
6. Contracts at the edge are runtime-validated instead of cast-shaped.
7. Documentation describes the achieved posture, not the intended one.

## Target architecture

### Layer map

#### 1. Contracts and pure value models

Target responsibility:

- schemas
- result models
- command DTOs
- value objects
- enum-like vocabularies

Allowed imports:

- other contracts
- pure guards
- pure utility modules with no host dependencies

Forbidden imports:

- `src/mcp/**`
- `src/cli/**`
- `src/hooks/**`
- `src/adapters/**`
- `@git-stunts/*`
- Node host modules

#### 2. Application and use-case services

Target responsibility:

- product behavior
- orchestration of domain actions across ports
- repo-local decision logic
- policy-aware use cases

Allowed imports:

- contracts
- ports
- pure domain/helpers

Forbidden imports:

- CLI/MCP/hook transport modules
- Node host modules
- concrete adapters
- direct `openWarp()` / direct plumbing construction

#### 3. Ports

Target responsibility:

- capability contracts for all infrastructure the application depends on

Existing ports:

- `FileSystem`
- `JsonCodec`
- `GitClient`
- `ProcessRunner`

Missing architecture-critical port:

- a first-class WARP graph port for commitment and observer reads

#### 4. Secondary adapters

Target responsibility:

- concrete Node / plumbing / git-warp implementations of ports

Examples:

- `nodeFs`
- `CanonicalJsonCodec`
- `nodeGit`
- `nodeProcessRunner`
- future WARP adapter over `@git-stunts/git-warp`

Allowed imports:

- host libraries
- `@git-stunts/*`
- port definitions

Forbidden imports:

- primary adapters

#### 5. Primary adapters and composition roots

Target responsibility:

- translate transport or command input into validated application input
- call one application use case
- translate application results into edge-specific output
- assemble concrete adapters into the running system

Examples:

- `src/cli/**`
- `src/mcp/tools/**`
- `src/hooks/**`
- MCP server / daemon transport entrypoints

Important rule:

- tool handlers and CLI commands should stop being alternate homes for
  business logic

## Dependency rules

The target import direction is:

`contracts <- application -> ports <- adapters`

Primary adapters depend inward on:

- contracts
- application
- ports
- composition wiring

They must not become a sideways dependency hub.

Concrete rules:

1. `src/application/**` must not import from `src/mcp/**`,
   `src/cli/**`, or `src/hooks/**`.
2. `src/application/**` must not import from `src/adapters/**` or call
   `openWarp()` directly.
3. `src/mcp/tools/**` and `src/cli/**` should validate input, call one
   application service, and shape output only.
4. `src/mcp/server.ts` should become composition-root wiring plus
   transport registration, not the owner of application behavior.
5. `src/mcp/workspace-router.ts` should stop being a mixed router,
   session manager, use-case host, and daemon coordinator.
6. WARP access should enter through one graph port and one or more
   adapters, not via cast-based “narrowing” from ambient `unknown`.
7. Edge-only scripts may import concrete adapters directly when they are
   genuinely standalone boundary scripts; those exceptions should be
   documented explicitly.

## Current hotspot mapping

### Concentration hotspots

- `src/mcp/server.ts`
- `src/mcp/workspace-router.ts`
- `src/mcp/persisted-local-history.ts`
- `src/mcp/repo-state.ts`
- `src/mcp/runtime-observability.ts`

### Boundary-truth hotspots

- `src/contracts/output-schemas.ts`
- `src/mcp/context.ts`
- `src/mcp/receipt.ts`
- many `src/mcp/tools/**` handlers

### Hex boundary hotspots

- `src/warp/open.ts`
- cast-based graph narrowing around persisted local history
- parser/operations modules that still mix core logic and host detail

## Migration sequence

### Slice 1: Layer map and dependency guardrails

Backlog:

- [CORE_hex-layer-map-and-dependency-guardrails.md](/Users/james/git/graft/docs/method/backlog/asap/CORE_hex-layer-map-and-dependency-guardrails.md:1)

What it settles:

- target directories and allowed dependency directions
- automated import rules in lint or dependency tooling
- truthful architecture wording

Why first:

- every later slice depends on knowing what “in bounds” means

### Slice 2: Thin primary adapters and use-case extraction

Backlog:

- [CORE_primary-adapters-thin-use-case-extraction.md](/Users/james/git/graft/docs/method/backlog/up-next/CORE_primary-adapters-thin-use-case-extraction.md:1)

Existing backlog clusters that fold into this slice:

- [CLEAN_CODE_mcp-context.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-context.md:1)
- [CLEAN_CODE_cli-main.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_cli-main.md:1)
- [CLEAN_CODE_mcp-tool-code-find-orchestration.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-code-find-orchestration.md:1)
- [CLEAN_CODE_mcp-tool-map-collector-orchestration.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-map-collector-orchestration.md:1)

What it settles:

- one application core for product behavior
- thin MCP/CLI adapters that delegate rather than own flow

### Slice 3: WARP port and adapter boundary

Backlog:

- [CORE_warp-port-and-adapter-boundary.md](/Users/james/git/graft/docs/method/backlog/up-next/CORE_warp-port-and-adapter-boundary.md:1)

Existing backlog clusters that fold into this slice:

- [CLEAN_CODE_warp-plumbing-declaration.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_warp-plumbing-declaration.md:1)
- [CLEAN_persisted-local-history-bypasses-git-warp-causal-graph.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_persisted-local-history-bypasses-git-warp-causal-graph.md:1)
- [CLEAN_CODE_mcp-persisted-local-history-composition.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-persisted-local-history-composition.md:1)

What it settles:

- one truthful graph capability boundary
- no more “ambient WARP” posture inside application logic

### Slice 4: Composition roots for CLI, MCP, daemon, and hooks

Backlog:

- [CORE_composition-roots-for-cli-mcp-daemon-and-hooks.md](/Users/james/git/graft/docs/method/backlog/up-next/CORE_composition-roots-for-cli-mcp-daemon-and-hooks.md:1)

Existing backlog clusters that fold into this slice:

- [CLEAN_CODE_mcp-server.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-server.md:1)
- [CLEAN_CODE_mcp-workspace-router-composition.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-workspace-router-composition.md:1)
- [CLEAN_CODE_mcp-daemon-server-lifecycle-composition.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-daemon-server-lifecycle-composition.md:1)
- [CLEAN_CODE_mcp-daemon-control-plane-composition.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-daemon-control-plane-composition.md:1)

What it settles:

- transport wiring lives at the edge
- application services become reusable from multiple entrypoints

### Slice 5: Runtime-validated command and context models

Backlog:

- [CORE_runtime-validated-command-and-context-models.md](/Users/james/git/graft/docs/method/backlog/up-next/CORE_runtime-validated-command-and-context-models.md:1)

Existing backlog clusters that fold into this slice:

- [CLEAN_CODE_contracts-output-schemas.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_contracts-output-schemas.md:1)
- [CLEAN_CODE_mcp-receipt.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-receipt.md:1)
- [CLEAN_CODE_mcp-tool-safe-read.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-safe-read.md:1)
- [CLEAN_CODE_mcp-tool-doctor.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-doctor.md:1)

What it settles:

- boundary truth via runtime-validated DTOs instead of structural casts
- less duplicated output shaping across entrypoints

## Existing debt that stays real

This packet does not replace the existing file-level `bad-code` cards.
It gives them a parent migration structure.

Examples that still remain valid:

- [CLEAN_CODE_parser-outline.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_parser-outline.md:1)
- [CLEAN_CODE_operations-graft-diff.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_operations-graft-diff.md:1)
- [CLEAN_CODE_mcp-runtime-observability-composition.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-runtime-observability-composition.md:1)

These are implementation hotspots to burn down within the convergence
sequence rather than evidence against having a sequence.

## New backlog produced by this cycle

- [CORE_hex-layer-map-and-dependency-guardrails.md](/Users/james/git/graft/docs/method/backlog/asap/CORE_hex-layer-map-and-dependency-guardrails.md:1)
- [CORE_primary-adapters-thin-use-case-extraction.md](/Users/james/git/graft/docs/method/backlog/up-next/CORE_primary-adapters-thin-use-case-extraction.md:1)
- [CORE_warp-port-and-adapter-boundary.md](/Users/james/git/graft/docs/method/backlog/up-next/CORE_warp-port-and-adapter-boundary.md:1)
- [CORE_composition-roots-for-cli-mcp-daemon-and-hooks.md](/Users/james/git/graft/docs/method/backlog/up-next/CORE_composition-roots-for-cli-mcp-daemon-and-hooks.md:1)
- [CORE_runtime-validated-command-and-context-models.md](/Users/james/git/graft/docs/method/backlog/up-next/CORE_runtime-validated-command-and-context-models.md:1)
- [CLEAN_architecture-doc-overclaims-strict-hexagonal-posture.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_architecture-doc-overclaims-strict-hexagonal-posture.md:1)

## Release-facing recommendation

Before the next release, the minimum honest architecture tranche is:

1. land the layer map and dependency guardrails
2. correct `ARCHITECTURE.md` to match repo truth
3. establish one fully extracted end-to-end use-case path
4. settle the WARP port boundary

That is enough to say the repo is on a strict-hex convergence path
without pretending the migration is already complete.
