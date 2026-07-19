---
title: "Graft source architecture and managed workspace convergence plan"
status: "proposed"
generated: "2026-07-18"
source_revision: "d1f5f14d"
source_branch: "cycle/agent-native-campaigns"
---

# Graft Source Architecture and Managed Workspace Convergence Plan

## 1. Purpose

This is the umbrella execution plan for two changes that must converge without
being confused:

1. Graft should stop placing Graft-owned state in every target repository and
   should make daemon-managed, multi-workspace operation the normal agent path.
2. MCP should become a thin agent-facing primary adapter instead of the de
   facto home of workspace, history, routing, worker, cache, metrics, and WARP
   application behavior.

The intended user experience is simple:

```text
An agent starts in an authorized working directory.
The agent calls a Graft tool.
Graft identifies and routes the workspace automatically.
Graft stores its own state under Graft's home, not in the target repository.
The tool succeeds without workspace_open or workspace_bind ceremony.
If authority is missing, Graft returns an exact repair instead of guessing.
Durable history remains an explicit, separately governed capability.
```

This plan integrates the source audit at `d1f5f14d` with existing design work.
It does not silently supersede the normative contracts in:

- [Daemon-first Graft-managed workspace store](../design/SURFACE_graft-managed-workspace-store.md)
- [Managed workspace store roadmap](../design/SURFACE_graft-managed-workspace-store-roadmap.md)
- [Hexagonal architecture convergence plan](../design/CORE_hexagonal-architecture-convergence-plan.md)
- [Primary adapters thin use-case extraction](../design/CORE_primary-adapters-thin-use-case-extraction.md)
- [Composition roots for CLI, MCP, daemon, and hooks](../design/CORE_composition-roots-for-cli-mcp-daemon-and-hooks.md)
- [WARP port and adapter boundary](../design/CORE_warp-port-and-adapter-boundary.md)

When this plan proposes a change to one of those documents, it labels the
change explicitly. Each implementation cycle still requires its own packet in
`docs/design/` under the repository's METHOD rules. This document coordinates
the campaign; it is not a substitute for PR-sized design packets.

## 2. Truth Posture

### 2.1 Verified current facts

At the source revision named above:

- `src/mcp/` contains approximately 19,102 lines of TypeScript.
- `src/operations/`, `src/ports/`, and `src/adapters/` together contain
  approximately 10,395 lines.
- API and CLI each import MCP modules in seven source locations.
- `ToolContext` exposes 42 fields or methods.
- The repository-tool worker supplies 19 unsupported context methods.
- `workspace-router.ts` is approximately 1,000 lines.
- persisted local-history implementation under `src/mcp/` is approximately
  3,127 lines.
- only five MCP modules, totaling 1,276 lines, directly import the MCP SDK.
- a static import-graph audit found no runtime import cycles and three
  type-only strongly connected components.
- plain `graft serve` selects repo-local operation.
- repo-local operation defaults to `<projectRoot>/.graft` and ensures that
  directory is excluded from Git.
- daemon-managed workspace observation exists, but it occurs as a side effect
  of explicit daemon authorization.
- an unbound daemon tool call still instructs the caller to invoke
  `workspace_bind`.
- daemon bootstrap suppresses directory and socket `chmod` failures while
  daemon status unconditionally reports `sameUserOnly: true`.
- the MCP output-schema authority is duplicated and is already known to have
  drifted for `code_find`.
- `pnpm lint` passed during the audit.
- the targeted architecture, registry, and path-boundary tests passed 29/29.

### 2.2 Interpretation

Graft is not architecturally unstructured. It has real contracts, ports,
secondary adapters, strict TypeScript, substantial runtime schemas, and
thoughtful workspace identity and confinement logic.

The primary problem is ownership:

> The application has been decomposed substantially, but much of that
> decomposition occurred inside the MCP namespace.

The second problem is product-path divergence:

> The daemon-managed model expresses the desired future, while the default
> agent path still uses the repo-local model that creates the unwanted state.

Approximate planning posture, not a coverage measurement:

| Campaign | Estimate | Confidence |
|---|---:|---|
| Strict hexagonal convergence | 45% | Medium |
| Managed-store critical path | G0 complete; G1 partial | High |
| Authorized resource router | Not started as the new model | High |
| No-pollution multi-workspace reads | Not yet demonstrated | High |
| No-open/no-bind agent experience | About 20% | Medium |

## 3. Problem Statement

### 3.1 Repository pollution

The normal MCP launch path stores Graft-owned material at
`<projectRoot>/.graft`. Graft then mutates repository exclusion state to hide
its own storage. This creates several product failures:

- every repository acquires tool-specific material;
- agents and humans encounter `.graft` state unrelated to the product source;
- linked worktrees and sibling repositories have fragmented state;
- cleanup and retention become repository lifecycle problems;
- Graft must alter Git exclusion configuration merely to operate;
- a workspace tool is made to look like repository content.

Target repository mutation may remain an explicit compatibility or portable
history feature. It must not remain the default cost of current-state reads.

### 3.2 Agent-visible workspace ceremony

The current daemon interface conflates four different concepts:

| Concept | Question | Desired behavior |
|---|---|---|
| Identification | What workspace does this coordinate name? | Automatic |
| Authorization | May this client access it? | Host/operator granted; fail closed |
| Activation | Which workspace should this call use? | Automatic per invocation |
| Tracking consent | May Graft retain durable history? | Explicit and separately governed |

An agent should not need to call `workspace_open`, `workspace_authorize`, and
`workspace_bind` merely to read a file in the working directory the host
already granted to it.

Conversely, an arbitrary `cwd` string must never create authority. Automatic
routing is not automatic authorization.

### 3.3 Primary-adapter ownership inversion

The architecture declares API, CLI, and MCP to be peer primary adapters over
one application core. Current source still contains paths of the form:

```text
CLI or API
  -> MCP server/tool/context machinery
  -> product behavior
```

The target direction is:

```text
API ----\
CLI -----+-> application use cases -> ports -> secondary adapters
MCP ----/
```

MCP may expose an explicitly named compatibility bridge through the public API.
It must not remain the internal application bus.

### 3.4 Mixed workspace-registry ownership

`src/mcp/workspace-registry.ts` currently combines:

- persisted record types;
- handwritten runtime validation;
- canonical identity encoding and hashing;
- pure incarnation decision rules;
- Node filesystem access;
- permission and path checks;
- lock acquisition and stale-lock reclamation;
- quarantine;
- atomic-file-shaped persistence;
- the `observeGitWorkspace` application use case.

Moving the file unchanged to a generic `src/core/` directory would only rename
the ambiguity. The responsibilities must be separated.

### 3.5 Security posture can outrun enforcement

The daemon currently suppresses permission-tightening failures and then reports
`sameUserOnly: true`. Because daemon sessions do not independently authenticate
an operating-system principal in the examined request path, socket access
control is load-bearing.

Security claims must be derived from verified platform evidence, not from the
configuration Graft attempted to establish.

### 3.6 Application interfaces are too broad

`ToolContext` is a transport-shaped service locator. It includes repository
reads, WARP, local history, daemon control, monitor lifecycle, workspace
authorization, receipts, caches, metrics, policy, and host capabilities.

The worker's need to stub 19 methods as unsupported is direct evidence that the
interface violates capability minimization and interface segregation.

### 3.7 Schema authority is duplicated

Compact discovery, full schema publication, runtime validation, CLI decoding,
and rendering must derive from one executable output contract. Two exhaustive
maps create agent-visible drift while local tests can remain green.

### 3.8 WARP remains ambient

Several MCP tools and workspace components receive or open a concrete
`WarpApp`. The current `StructuralHistoryPort` identifies providers but does not
yet carry the operational history surface needed to remove concrete WARP from
the application.

This must be corrected without coupling the workspace campaign to git-warp v19
or prematurely claiming Echo parity.

## 4. Campaign Objectives

### 4.1 Primary objectives

1. Default current-state Graft operation does not create or modify state in the
   target repository.
2. An agent can call repository tools from an authorized working directory
   without first calling an agent-visible open, bind, or authorize tool.
3. Authorization remains explicit, inspectable, revocable, and independent of
   path identification.
4. Durable history remains explicit, scope-bounded, and independent of ordinary
   current-state reads.
5. Workspace contracts, use cases, persistence capabilities, and Node storage
   live in the correct architectural layers.
6. API, CLI, and MCP invoke the same application services.
7. MCP handlers validate protocol input, invoke one use case, and project
   protocol output; they do not own business flow.
8. Daemon security posture reports only verified guarantees.
9. Runtime, CLI, compact discovery, and full schema publication derive from one
   output-schema authority.
10. git-warp and future Echo providers enter through application-owned ports.

### 4.2 Secondary objectives

- Preserve current public behavior during extraction whenever behavior is not
  intentionally changed by a separately reviewed slice.
- Preserve explicit repo-local mode as a compatibility and recovery path.
- Make migration and rollback safe across rolling CLI/daemon versions.
- Improve source navigability for humans and agents.
- Replace directory-level architectural aspiration with executable dependency
  rules.
- Make denial actionable: name the missing grant and the lawful repair without
  leaking unrelated registry state.

### 4.3 Non-goals

- Rewriting the entire repository in one campaign.
- Moving files solely to improve directory aesthetics.
- Creating a generic `src/core/` junk drawer.
- Replacing git-warp with Echo in the workspace-store campaign.
- Waiting for durable history, document projection, or every lifecycle command
  before proving no-pollution current-state reads.
- Treating process readability as client authorization.
- Automatically importing, deleting, or rewriting existing repo-local `.graft`
  history.
- Automatically removing old `.git/info/exclude` entries.
- Giving every agent registry-administration authority.
- Freezing speculative TypeScript interface sketches in this plan as public
  contracts before their PR-sized design packets and fixtures exist.
- Testing Markdown wording as a product invariant.

## 5. Product Laws

1. **MCP is a transport, not the application.**
2. **A path hint is not a capability.** `cwd` helps resolve a target; it does
   not grant access to that target.
3. **Identification, authorization, activation, and tracking consent are
   separate decisions.**
4. **Current-state reads do not require durable history.**
5. **Default reads do not mutate the target repository.**
6. **Security posture is observed, not asserted.** A failed permission or ACL
   check fails closed or produces a truthfully weaker posture.
7. **One request has one explicit route context.** No repository-scoped tool
   silently depends on mutable global active-workspace state.
8. **One executable schema authority describes each output.** Compact and full
   projections may differ in detail but not in legal meaning.
9. **Application services depend on ports, never concrete host adapters.**
10. **Concrete WARP and Echo clients stay behind secondary adapters.**
11. **Foreign or legacy history is not silently reclassified as native
    evidence.**
12. **Denied access does not disclose the registry.** Repair information is
    bounded to what the caller may know.
13. **No state migration is implicit merely because the default runtime
    changes.**
14. **Every rollout has a reversible compatibility posture.**
15. **Every PR delivers one reviewable behavioral or architectural claim.**

## 6. Target Product Behavior

### 6.1 Normal agent path

The desired normal path is:

```text
MCP client launches Graft from /work/repo-a
  -> bridge records a host-provided session root/grant
  -> Graft connects to or starts the local daemon
  -> agent calls safe_read({ path: "src/a.ts" })
  -> route resolver uses the session default coordinate
  -> authorization evaluator verifies the coordinate is inside the grant
  -> workspace identity is resolved automatically
  -> workspace observation is created/refreshed under GRAFT_HOME
  -> safe-read use case runs
  -> MCP projects compact or full output plus a scoped receipt
```

The agent does not call `workspace_open` or `workspace_bind`.

### 6.2 Cross-repository path

When the host grants two sibling repositories, one daemon session can route
both:

```text
authorized roots:
  /work/server
  /work/sdk

safe_read server/src/a.ts
safe_read sdk/src/b.ts
```

Both reads succeed, neither repository receives `.graft`, and a third
unauthorized sibling is refused without being enumerated.

### 6.3 Missing authority

If the requested coordinate is not authorized, Graft returns a structured
obstruction similar to:

```json
{
  "ok": false,
  "errorCode": "WORKSPACE_NOT_AUTHORIZED",
  "resource": {
    "kind": "requested-coordinate"
  },
  "repair": {
    "kind": "request-host-grant",
    "requestedScope": "opaque-or-redacted"
  }
}
```

The exact public contract belongs in the G2 router packet. The invariant is
that an agent receives a lawful repair, not instructions to manufacture its own
authority by calling another tool.

### 6.4 Durable tracking

The first successful read may establish or refresh an observation record. It
must not silently enable durable structural history.

Durable tracking requires a separate plan and consent/authority flow that
names:

- tracking scope;
- provider;
- physical storage;
- retention;
- maintenance authority;
- expected cost;
- target-repository mutation posture;
- pause, revocation, export, and deletion behavior.

### 6.5 Explicit repo-local compatibility mode

Repo-local mode remains available during and after rollout:

```text
graft serve --runtime repo-local
```

Its behavior must be explicit in receipts and diagnostics. It may continue to
use `<projectRoot>/.graft` for compatibility, but it must never be selected
silently after the daemon-backed default has shipped unless the documented
fallback policy permits it.

## 7. Target Architecture

### 7.1 Layer responsibilities

| Layer | Owns | Must not own |
|---|---|---|
| Contracts | Runtime schemas, command/result DTOs, value models, error vocabulary | Host I/O, MCP, CLI, concrete WARP |
| Operations | Use cases, orchestration, policy decisions, pure workspace decisions | Node APIs, MCP results, concrete adapters |
| Ports | Capabilities required by operations | Application orchestration, transport output |
| Secondary adapters | Node filesystem, Git, process, registry persistence, git-warp/Echo implementations | Product decisions, MCP schemas |
| Composition roots | Construction and dependency wiring | Reusable business logic |
| API/CLI/MCP | Edge validation, use-case invocation, edge-specific projection | Shared business flow |

### 7.2 Proposed source topology

Names are proposed and may be refined in the slice packet, but responsibility
must not be recombined:

```text
src/
  contracts/
    workspaces/
      registry.ts
      routes.ts
      authorization.ts
      receipts.ts
  operations/
    workspaces/
      derive-workspace-identity.ts
      decide-incarnation.ts
      observe-git-workspace.ts
      resolve-workspace-route.ts
      explain-workspace-obstruction.ts
    reads/
      safe-read.ts
      read-range.ts
      file-outline.ts
      changed-since.ts
  ports/
    workspace-registry-store.ts
    workspace-authorization.ts
    workspace-opener.ts
    structural-history.ts
  adapters/
    node-workspace-registry-store.ts
    node-workspace-opener.ts
    git-workspace-identity.ts
    git-warp-structural-history.ts
    echo-structural-history.ts
  composition/
    repo-local.ts
    daemon.ts
  mcp/
    server.ts
    stdio-server.ts
    daemon-session-host.ts
    daemon-stdio-bridge.ts
    tools/
      safe-read.ts
      workspace-status.ts
      ...
```

If a new `src/composition/` directory is not adopted, equivalent thin assembly
may remain at entrypoint modules. The important rule is that construction is
isolated and behavior lives below it.

### 7.3 Workspace registry seam

The registry must be split into four independently testable parts.

#### Contracts and pure identity

Own:

- versioned records;
- runtime schemas;
- typed IDs;
- canonical identity preimages;
- deterministic ID derivation;
- pure incarnation transition decisions.

Do not own filesystem paths, locks, or MCP types.

The canonical codec must not be imported from an Echo-named integration
module. It should be a foundational canonical-encoding facility or an explicit
pure dependency whose domain is identity, not execution.

#### Registry port

Illustrative, not frozen:

```ts
interface WorkspaceRegistryStore {
  loadInstallation(): Promise<InstallationRecord | null>;
  createInstallation(input: CreateInstallationRecord): Promise<InstallationRecord>;
  readWorkspace(id: WorkspaceId): Promise<WorkspaceRecord | null>;
  observeWorkspace(input: WorkspaceObservationCommit): Promise<WorkspaceRecord>;
  quarantine(input: RegistryQuarantineRequest): Promise<RegistryQuarantineResult>;
}
```

The port must express generations or another concurrency primitive. It must not
pretend two independently published files form one transaction unless the
adapter can prove that property.

#### Observation use case

Own:

- resolving existing records through the port;
- deciding reuse, suspect, replacement, or quarantine posture;
- constructing the next records;
- invoking one atomic publication operation;
- returning an application result independent of MCP receipts.

#### Node adapter

Own:

- path layout;
- `lstat`, ownership, permission, and symlink enforcement;
- locks, leases, owner tokens, or generation fencing;
- atomic replacement and fsync policy;
- crash recovery;
- quarantine movement;
- JSON or future storage representation.

### 7.4 State topology

The conceptual managed layout is:

```text
GRAFT_HOME/
  installation.json
  daemon/
    runtime and transport state
  workspaces/
    ws_<id>/
      metadata
      incarnations/
        wi_<id>/
          metadata
          derived-cache/
      history-bindings/
      receipts-or-references/
```

The exact physical layout remains governed by the managed-store contract and
G1 design packets.

A single global `workspaces.json` should not be the only source of truth. It
would create a contention and corruption domain. A derived index is acceptable
if individual versioned records remain authoritative and recoverable.

### 7.5 Per-invocation route context

Illustrative, not frozen:

```ts
interface WorkspaceRouteRequest {
  sessionId: string;
  coordinate?: string;
  workspaceHandle?: string;
  operation: WorkspaceOperationKind;
}

interface WorkspaceExecutionContext {
  resourceScope: ResourceScope;
  projectRoot?: string;
  workspaceId?: string;
  incarnationId?: string;
  visibilityContext: VisibilityContext;
  capabilityProfile: WorkspaceCapabilityProfile;
  storagePosture: "managed" | "repo-local" | "memory" | "none";
}
```

The route resolver must not mutate a session-global active workspace merely to
service one call. A session default coordinate may exist for clients that do
not supply per-call coordinates, but the resolved execution context is owned by
the invocation.

### 7.6 Agent working directory transport

MCP does not automatically make an agent's current working directory a trusted
per-call protocol field. Graft therefore needs an explicit integration rule:

- a repo-local stdio server may use its launch directory as the host-provided
  session root;
- a daemon stdio bridge may transmit its launch directory and configured
  allowed roots as authenticated initialization metadata;
- clients capable of sending per-call coordinates may do so as route hints;
- a route hint is accepted only when it falls within a current grant;
- the daemon process's own working directory is never used as ambient
  authority;
- integrations unable to communicate a trustworthy grant use a sandbox-local
  reader, configured allow-roots, or an opened-handle flow.

The G2 design packet must freeze how bridge initialization metadata is bound to
the authenticated daemon session.

### 7.7 Read-family application service

The first extracted application service should cover:

- `safe_read`;
- `read_range`;
- `file_outline`;
- `changed_since` where its history requirement is accurately represented.

It should receive narrow dependencies such as:

```ts
interface GovernedReadDependencies {
  opener: AuthorizedWorkspaceOpener;
  filesystem: FileSystem;
  parser: StructuralParser;
  policy: ReadPolicy;
  observations: ObservationStore;
}
```

It should return an application result. MCP receipts, CLI rendering, and API
types are projections over that result.

### 7.8 Worker boundary

Worker execution should no longer reconstruct all of `ToolContext` and call an
MCP handler. It should accept a versioned application command envelope:

```text
parent adapter
  -> validate edge input
  -> resolve authorized execution context
  -> submit versioned application command
worker
  -> execute use case with exact dependencies
  -> return application result and internal evidence
parent adapter
  -> update metrics/cache state
  -> project MCP/API/CLI result
```

Unsupported capabilities should be unrepresentable, not methods that fail only
when called.

### 7.9 WARP and structural-history boundary

The application-owned structural-history port must eventually cover the
operations required by local-history and structural tools. It must preserve
Graft's semantic distinctions rather than becoming a generic graph abstraction.

Rules:

- concrete `WarpApp` types stay in the git-warp adapter;
- Echo client types stay in the Echo adapter;
- provider evidence labels remain explicit;
- current-state reads do not open WARP unless the use case requires history;
- git-warp v19 work is integrated after the port shape is stable enough to
  absorb it;
- Echo is not called native until the existing Echo integration gate is met.

## 8. Security and Authority Model

### 8.1 Daemon bootstrap truth

Before daemon-first can become default, startup must:

1. resolve the intended Graft home and socket path;
2. `lstat` every security-relevant parent under Graft control;
3. reject symlinks and unexpected file types;
4. establish restrictive permissions or platform ACLs;
5. verify the resulting ownership and access posture;
6. refuse startup when a required guarantee cannot be established;
7. derive reported posture from verified facts;
8. distinguish unsupported platform guarantees from verified guarantees.

`sameUserOnly` may be `true` only when Graft possesses evidence for that exact
transport instance.

### 8.2 Session authentication and grants

The daemon must bind each request to an authenticated session and current
grants. A session identifier used for request routing is not by itself proof of
authorization.

Grants must support:

- opaque identifiers in receipts;
- resource scope;
- allowed operations;
- epoch or generation;
- expiry;
- revocation;
- least-privilege disclosure;
- host/operator provenance.

### 8.3 Route resolution

Route resolution must:

- normalize the requested coordinate without widening it;
- verify it against the current grant before repository discovery can leak
  information;
- use race-safe beneath-root traversal for supported platforms;
- refuse special files and unsupported path guarantees;
- distinguish workspace, opened root, scoped directory, and object-only
  results;
- return `unknown` scope relations as denial, not permission;
- avoid inventing workspace identity for object-only reads.

### 8.4 Registry disclosure

Ordinary agent sessions must not receive a global workspace list. Status and
explanation surfaces are filtered to resources intersecting current authority.
Registry administration remains a trusted local operator capability.

### 8.5 Cache and derived artifacts

Derived artifacts inherit the visibility, policy, incarnation, and truth
constraints of their inputs. A cache hit from a broader historical grant is not
safe merely because the current requested path is authorized.

## 9. Execution Plan

Each slice below is intended to fit one reviewable PR. Refactoring, public
behavior changes, and state migrations should remain separate unless the slice
cannot be truthful without combining them.

### Phase 0 — Baseline and security correction

#### S0.1 — Verified daemon-home posture

**Result:** daemon startup verifies directory type, ownership, permissions, and
platform support.

**Acceptance:**

- symlinked daemon home is refused;
- non-owned or unverifiable security-sensitive paths fail closed according to
  documented platform posture;
- `chmod` failure cannot be ignored;
- status reflects observed posture;
- no normal repository behavior changes.

#### S0.2 — Verified socket or named-pipe posture

**Result:** socket permissions or named-pipe ACLs are established and verified.

**Acceptance:**

- Unix socket mode is re-read after creation;
- unsupported ACL guarantees are explicit;
- `sameUserOnly` is never unconditional;
- initialization without the required transport security is refused or routed
  through an independently authenticated mode.

#### S0.3 — Threat and regression matrix update

**Result:** the managed-store threat matrix names the enforcement point and
tests for every daemon bootstrap claim.

**Dependencies:** S0.1 and S0.2.

### Phase 1 — Workspace registry architectural extraction

#### S1.1 — Registry contracts and executable schemas

Move versioned workspace, incarnation, installation, retention, and storage
records to contracts. Replace permissive handwritten checks with one runtime
schema authority. Reject negative budgets and TTLs.

No persistence or behavior change belongs in this slice.

#### S1.2 — Canonical workspace identity module

Extract deterministic encoding, typed IDs, checked decoding, remote
sanitization, and pure incarnation decisions. Remove the registry's dependency
on an Echo-named CBOR module.

Golden identity vectors must remain byte-for-byte stable unless a separately
versioned migration is approved.

#### S1.3 — Registry persistence port

Define exact load, observe/commit, quarantine, generation, and diagnostic
capabilities. The port must allow tests to model conflict, interruption, and
corruption without Node filesystem I/O.

#### S1.4 — Node registry adapter

Move path layout, confinement, permissions, locks, persistence, fsync, and
quarantine behind the port.

Acceptance includes:

- generation conflict tests;
- concurrent observer tests longer than the former one-second wait;
- stale-owner fencing rather than age-only lock deletion;
- interruption between write, fsync, rename, and parent fsync;
- workspace/incarnation publication consistency;
- malformed and unknown-major quarantine/refusal;
- restart recovery.

#### S1.5 — Observe-workspace use case

Move reconciliation and incarnation policy into an application service using
the registry port. Return application results independent of MCP.

#### S1.6 — Daemon composition injection

Construct the Node adapter at the daemon composition root and inject the
observation use case into the control plane. Leave a compatibility re-export at
the old MCP module only while imports migrate.

#### S1.7 — Remove the compatibility re-export

Delete the old MCP registry module after API, CLI, MCP, tests, and daemon code
depend on the application seam.

### Phase 2 — Read use cases and worker decoupling

#### S2.1 — `safe_read` application use case

Extract governed current-state read behavior with exact ports and an
application result. Prove direct API and MCP parity.

#### S2.2 — `read_range` application use case

Use the same opener, snapshot identity, policy, and observation semantics as
`safe_read`. Do not create a second cache or path-resolution path.

#### S2.3 — `file_outline` application use case

Add parser-backed projection through an explicit parser capability. Preserve
unstable-read detection and output semantics.

#### S2.4 — Remaining read-family extraction

Extract `changed_since` and current-snapshot map behavior, explicitly naming
where committed or structural history becomes required.

#### S2.5 — Versioned worker command envelope

Make worker execution consume application commands rather than MCP tool
definitions. Remove unsupported `ToolContext` methods from the worker.

#### S2.6 — Decompose `ToolContext`

Replace the global service locator with exact handler/use-case dependencies.
Retain receipt and footprint projection as edge concerns.

### Phase 3 — Authorized per-call workspace routing

This phase corresponds to the secure G2 router, not merely a friendlier wrapper
over existing global binding.

#### S3.1 — Session-root and grant bootstrap

Bind stdio launch coordinates/configured roots to the daemon session using
authenticated initialization metadata. Freeze rolling-version behavior.

#### S3.2 — Resource route contracts

Implement workspace-view, opened-root, scoped-directory, and object-only route
results plus conservative scope algebra and failure taxonomy.

#### S3.3 — Per-invocation route resolver

Resolve each repository operation against its coordinate and current grants.
Do not mutate session-global active workspace state as part of resolution.

#### S3.4 — Automatic authorized observation

After a successfully authorized resolution, create or refresh the managed
workspace observation automatically. Observation must not imply history
tracking.

#### S3.5 — Repair-shaped authorization obstruction

Replace instructions to call `workspace_bind` with a structured host-grant
repair. Preserve explicit operator authorization tools for integrations that
need them.

#### S3.6 — Multi-repository session proof

One session reads two authorized sibling repositories and refuses a third. No
target is mutated. Every receipt names the resource scope and authorizing grant
without leaking unrelated paths.

### Phase 4 — No-pollution current-state rollout

The existing roadmap places all daemon-first rollout at G12 after later history
and lifecycle goalposts. This plan proposes splitting that rollout:

- **G12a:** daemon-first current-state reads after G1-G3 security and parity
  gates;
- **G12b:** durable-history and lifecycle rollout after G4-G8.

This is a proposed roadmap amendment. It follows the existing product law that
current-state reads do not require durable history.

#### S4.1 — Opt-in daemon-backed normal-read path

Run the new path behind an explicit feature/runtime choice. Gather parity,
latency, denial, restart, and fallback evidence.

#### S4.2 — Shadow comparison

Where safe and bounded, compare repo-local and daemon-backed application
results without publishing duplicate user output or mutating target state.

#### S4.3 — Default `graft serve` flip

Make daemon-backed managed current-state reads the default only after the G1-G3
exit gates pass. Preserve explicit `--runtime repo-local`.

#### S4.4 — Target-repository mutation audit

Prove the default path does not:

- create `<repo>/.graft`;
- alter `.git/info/exclude`;
- alter `.gitignore`;
- initialize git-warp;
- enable durable tracking;
- change worktree contents or Git metadata.

#### S4.5 — Fallback and rollback contract

Define when daemon unavailability may use an in-process memory/none-storage
fallback and when it must refuse. Never silently fall back to repo-local
persistence. Add a documented operator switch to restore the previous runtime
while diagnosing regressions.

### Phase 5 — One agent-facing schema authority

#### S5.1 — Select the canonical MCP body-schema assembly

Choose one exhaustive map as authority and freeze representative union,
refusal, obstruction, and compact/full vectors.

#### S5.2 — Derive every consumer

Make runtime validation, CLI decoding, rendering, generated JSON Schema, and
capability discovery derive from the same authority.

#### S5.3 — Delete the duplicate map

Remove the second exhaustive assembly and add mutation tests proving consumers
cannot project a stale legal-output shape.

#### S5.4 — Publish compact/full relationship metadata

Make it explicit which projection is compact, which is full, and which fields
may be omitted without changing semantic legality. Receipts should name the
projection and schema version.

### Phase 6 — Router, history, monitor, and metrics extraction

#### S6.1 — Workspace router contracts and resolver

Separate route models, resolution, execution-context construction, and
session/default-coordinate state.

#### S6.2 — Persisted local-history application capability

Move policy, projection, and history orchestration out of MCP. MCP retains only
tool translation.

#### S6.3 — Monitor application capability

Replace hardcoded Node Git/path/WARP construction in monitor jobs with explicit
ports and application commands.

#### S6.4 — Metrics, cache, and causal-context ownership

Classify each generic support module by responsibility and migrate it without
creating another miscellaneous directory. Compatibility re-exports are
acceptable temporarily.

#### S6.5 — Thin workspace router facade removal

Once all consumers use the extracted services, retire the old router facade and
its type-only dependency knot.

### Phase 7 — Structural-history provider boundary

#### S7.1 — Operational `StructuralHistoryPort`

Extend the port from provider description/status to the exact operations used
by Graft. Preserve semantic evidence labels and bounded query behavior.

#### S7.2 — git-warp adapter

Move concrete `WarpApp` pooling, opening, reads, and writes behind the adapter.
Coordinate implementation details with git-warp v19 after its interface is
stable enough to consume.

#### S7.3 — Tool migration

Migrate structural log, blame, churn, refactor difficulty, precision, code
find/show, and persisted local history away from `ToolContext.getWarp()`.

#### S7.4 — Echo parity adapter

Implement only after the existing Echo integration gate is satisfied. Compare
generated-model results and evidence posture before normal operation stops
opening git-warp.

#### S7.5 — Dependency enforcement

Forbid concrete `@git-stunts/git-warp` imports outside the adapter and approved
composition/testing modules.

### Phase 8 — Guardrails and source-topology closure

#### S8.1 — Primary-adapter peer-import rules

Prevent API, CLI, MCP, and hooks from importing peer adapters except named
compatibility or composition modules.

#### S8.2 — MCP host-import allowlist

After extraction, permit Node host imports only in protocol transport,
composition, and explicitly justified edge modules.

#### S8.3 — Real architecture tests

Replace Markdown-string assertions with executable import rules, API parity,
security, and behavior tests. Documentation remains checked through links,
lint, review, and source-truth audits.

#### S8.4 — Architecture and topology truth update

Update `ARCHITECTURE.md`, `docs/repo-topology.md`, `BEARING.md`, and the relevant
retros only when code and tests earn the claim.

## 10. Dependency Order

```text
S0 daemon permission truth
  -> S1 registry extraction and durable store correctness
  -> S3 authenticated per-call router
  -> S4 daemon-first current-state default

S1 registry extraction
  -> S3 automatic observation
  -> later managed history and lifecycle work

S2 read use cases
  -> S3 routed execution
  -> S4 cross-surface default rollout

S5 schema authority
  -> may run after S0 in parallel
  -> must finish before claiming stable compact/full agent contracts

S6 application extraction
  -> follows proven read/router seams incrementally

S7 WARP/Echo boundary
  -> follows application-owned port definition
  -> does not block S4 current-state rollout

S8 guardrail closure
  -> lands incrementally after each clean territory exists
```

The narrowest critical path to the user-visible win is:

```text
verified daemon security
  -> registry port/adapter/use case
  -> read application service
  -> authenticated per-call cwd routing
  -> two-repository no-pollution proof
  -> daemon-backed current-state default
```

## 11. Verification Strategy

### 11.1 Unit tests

- canonical workspace and incarnation identity vectors;
- checked typed-ID decoding;
- remote sanitization;
- incarnation transition decisions;
- negative and overflow retention rejection;
- generation conflict behavior;
- route scope algebra including `unknown`;
- authorization versus identification separation;
- application use cases with fake ports;
- compact/full schema derivation;
- truthful daemon posture derivation.

### 11.2 Security and adversarial tests

- symlinked Graft home;
- non-directory socket parent;
- permission-tightening failure;
- wrong owner where detectable;
- stale socket with and without active listener;
- unsupported named-pipe ACL guarantee;
- guessed workspace/view IDs;
- unauthorized parent and sibling discovery;
- symlink and mount traversal races;
- special files;
- expired and revoked grants;
- stale session initialization metadata;
- broader cached artifact requested under narrower authority.

### 11.3 Crash and concurrency tests

- two concurrent first-start installation writers;
- two observers for one workspace;
- observation longer than the former lock timeout;
- expired lock with a live owner;
- crash before temporary-file fsync;
- crash after file fsync but before rename;
- crash after rename but before parent fsync;
- crash between workspace and incarnation publication;
- daemon restart during registry migration;
- old and new daemon/CLI rolling-version combinations.

### 11.4 Cross-surface parity tests

For each extracted use case:

- direct API invocation;
- CLI invocation where supported;
- MCP compact output;
- MCP full output;
- daemon worker execution;
- repo-local compatibility execution.

Tests assert shared behavior and structured contracts, not incidental prose.

### 11.5 Golden multi-workspace scenario

Fixture:

```text
root/
  server/       authorized Git repo
  sdk/          authorized Git repo
  private/      unauthorized Git repo
```

Required evidence:

1. one daemon-backed MCP session starts from `server`;
2. `safe_read` succeeds in `server`;
3. `safe_read` succeeds in `sdk` after an authorized route hint;
4. `read_range` and `file_outline` use the same route semantics;
5. access to `private` is refused without enumeration leakage;
6. no target contains `.graft`;
7. no target Git exclusion file changes;
8. restart preserves managed identity without granting new authority;
9. revocation immediately prevents the next call;
10. receipts identify runtime, scope, grant, workspace/incarnation when
    applicable, storage posture, and whether durable history was used.

### 11.6 Performance tests

Measure rather than assume:

- cold daemon startup and connect time;
- warm reconnect time;
- workspace route resolution latency;
- registry observation latency;
- cache hit/miss latency;
- two-, ten-, and hundred-workspace registry behavior;
- lock contention;
- worker command-envelope overhead;
- compact versus full response bytes.

Performance must not justify weakening authority or truth posture.

## 12. Receipt and Observability Contract

Every daemon-routed operation should make the following facts available in its
full receipt, subject to disclosure policy:

- runtime kind and version;
- transport kind;
- verified transport security posture;
- session identity or opaque session reference;
- opaque authorizing grant ID and epoch;
- resource-scope kind;
- workspace, view, and incarnation IDs when applicable;
- route coordinate source: launch default, explicit hint, handle, or operator
  selection;
- storage posture: managed, repo-local, memory, or none;
- observation/cache/history participation;
- durable-history binding and coverage only when used;
- policy/schema/projection versions;
- fallback posture;
- residual uncertainty or refusal reason.

Compact output may omit most receipt details, but it must carry enough identity
to retrieve or request the governed full explanation where authorized.

Metrics should distinguish:

- automatic route success;
- missing grant;
- identification failure;
- registry observation failure;
- daemon unavailable;
- explicit repo-local use;
- memory fallback;
- unexpected target mutation attempt;
- schema projection mismatch.

Metrics must not expose unauthorized paths or content.

## 13. Migration and Compatibility

### 13.1 Existing repo-local `.graft`

Do not silently move or delete it.

Classify content as:

- reconstructible derived cache;
- portable durable history;
- receipts or audit material;
- unknown/unsupported legacy state.

Derived cache may be rebuilt. Durable history requires an explicit import or
binding operation with a plan, evidence posture, and rollback. Unknown state is
preserved and reported.

### 13.2 Existing Git exclusions

The daemon-first default stops adding new exclusions. It does not automatically
remove old `.git/info/exclude` or `.gitignore` entries because those may have
been intentionally retained or edited by the user.

`graft doctor` may report stale Graft-authored exclusions and offer a reviewed
repair plan later.

### 13.3 Rolling daemon and CLI versions

Initialization metadata, worker command envelopes, registry records, and
receipts are versioned. New clients must fail clearly or negotiate a bounded
compatibility path with older daemons. Unknown major persisted records fail
closed.

### 13.4 Rollback

The operator can restore explicit repo-local operation without changing target
history. Rollback must not reinterpret managed observations as repo-local
history or copy state implicitly.

### 13.5 Public API

Direct application services become the preferred in-process API. An MCP-style
tool bridge may remain as an explicitly named compatibility surface, but API
callers should not need MCP receipts or server construction to use governed
reads.

## 14. Risk Register

| Risk | Consequence | Mitigation |
|---|---|---|
| Daemon-default ships before transport security is proven | Cross-user local disclosure or false trust claim | S0 hard gate; fail closed |
| Automatic cwd is mistaken for authority | Path escalation | Bind route hints to authenticated grants |
| Session-global active workspace survives | Cross-repo confusion and concurrency races | Per-invocation execution context |
| Registry extraction changes identity bytes | Orphaned observations/history | Golden vectors and versioned migration |
| Two-file publication remains non-transactional | Inconsistent workspace/incarnation records | One commit primitive, generations, crash tests |
| Single global manifest becomes a hotspot | Contention and large corruption domain | Per-record authority; derived index |
| Default flip silently falls back to repo-local | Repository pollution returns invisibly | Explicit fallback posture; never persist silently |
| Schema consolidation breaks CLI renderers | Agent/operator incompatibility | Cross-surface vectors and rolling-version tests |
| WARP refactor races git-warp v19 | Repeated churn | Stabilize application port first; adapter later |
| Echo is introduced before parity | Unsupported native-evidence claim | Preserve integration gate and evidence labels |
| Architecture effort becomes one giant PR | Review failure and hidden regressions | One claim/state migration per slice |
| Registry/status leaks workspace existence | Cross-session metadata disclosure | Capability-filtered projections and adversarial tests |
| Windows security semantics are assumed | False same-user guarantee | Platform-specific ACL adapter and truthful unsupported posture |
| Full history becomes prerequisite for reads | Delayed product value and unnecessary storage | Keep current-state critical path independent |

## 15. Success Metrics and Definition of Done

### 15.1 User-visible completion

- Plain `graft serve` uses the proven daemon-managed current-state path by
  default.
- Starting and using Graft in a clean repository creates no `.graft` path in
  that repository.
- Default operation makes no Git exclusion change.
- An agent can use the common read tools from its authorized launch coordinate
  without `workspace_open`, `workspace_authorize`, or `workspace_bind`.
- The same session can use two authorized repositories.
- Unauthorized coordinates fail closed with a bounded repair.
- Durable history is neither initialized nor implied by an ordinary read.
- Explicit repo-local mode remains available and visible.

### 15.2 Architecture completion

- Workspace registry contracts, use case, port, and Node adapter live in their
  respective layers.
- API, CLI, and MCP call shared use cases.
- Repository workers execute application commands rather than MCP handlers.
- `ToolContext` no longer acts as a cross-product service locator.
- workspace routing and persisted local history are not implemented under MCP.
- concrete `WarpApp` is confined to approved adapter/composition/test modules.
- primary-adapter peer imports are mechanically guarded.
- MCP host imports are limited to named transport/composition exceptions.
- documentation claims match executable source truth.

### 15.3 Security completion

- daemon home and transport restrictions are verified, not attempted silently;
- `sameUserOnly` is derived from evidence;
- every request is bound to an authenticated session and current grant;
- guessed IDs confer no authority;
- unauthorized registry entries are not enumerable;
- route traversal meets the declared platform security floor or refuses;
- revocation affects the next operation;
- cache/history artifacts do not cross visibility contexts without proven safe
  filtering.

### 15.4 Agent-DX completion

- one executable output-schema authority exists;
- compact and full projections are both published and related explicitly;
- output validation, discovery, CLI decoding, and rendering cannot drift by
  choosing different schema maps;
- authorization failures tell the client what class of host repair is needed;
- receipts explain runtime, route, basis, authority, and storage without
  overwhelming compact output.

## 16. Review Gates

No slice advances solely because files moved or prose was updated.

Every implementation PR must include:

1. a PR-sized `docs/design/` packet;
2. explicit hill, acceptance criteria, non-goals, and playback questions;
3. RED evidence tied to a Graft behavior or invariant;
4. implementation and focused tests;
5. architecture/dependency checks appropriate to the moved boundary;
6. documentation and receipt/schema updates where behavior changed;
7. a completed local retro before PR creation;
8. clean CI and completed third-party review under `CODE_STANDARDS.md`;
9. a rollback or compatibility statement;
10. no unrelated refactor bundled into the slice.

Tests must assert behavior, authority, structured contracts, and import rules.
They must not merely assert Markdown headings or incidental wording.

## 17. Open Decisions

These questions require a PR-sized decision because their answers change
implementation:

1. **Session grant source:** What exact metadata can each supported MCP host
   provide about launch roots or filesystem grants, and how is that metadata
   authenticated to the daemon?
2. **Default coordinate:** For clients without a per-call coordinate, is the
   stdio bridge's launch directory the sole default, or can the host update it
   during a session?
3. **G12 split:** Approve or reject the proposed G12a current-state rollout
   after G3 and G12b durable-history rollout after G8.
4. **Registry transaction model:** Directory generation swap, journaled records,
   embedded database, or another mechanism?
5. **Lock model:** Owner token and fencing, advisory OS lock, lease heartbeat, or
   storage-engine transaction?
6. **Canonical identity codec home:** Foundational pure module or explicit codec
   port?
7. **Composition topology:** New `src/composition/` directory or thin assembly
   retained in entrypoint homes?
8. **Fallback:** Which current-state operations may use memory/none storage when
   the daemon is unavailable, and which must refuse?
9. **Explicit workspace tools:** Do `workspace_open` and `workspace_bind` remain
   operator/debugging surfaces, become deprecated aliases, or disappear after
   automatic routing?
10. **Legacy history import:** What exact evidence label and consent flow apply
    when importing an existing repo-local git-warp store?
11. **Windows support floor:** Which named-pipe ACL guarantees can Graft verify
    in the supported Node runtime?
12. **Path privacy:** Which route and repair fields may expose canonical paths to
    ordinary agent sessions?
13. **Public API stability:** Which extracted read-service types become stable
    package API versus internal application contracts?
14. **Metrics retention:** How can routing and denial telemetry remain useful
    without becoming a local workspace-surveillance ledger?

## 18. Recommended Immediate Queue

The next five design/implementation cycles should be:

1. **Verified daemon security posture** — correct the false `sameUserOnly`
   possibility and create the platform test matrix.
2. **Registry contracts and pure identity extraction** — behavior-preserving,
   with golden identity vectors.
3. **Registry port and crash-consistent Node adapter** — generations, fencing,
   fsync, and interruption tests.
4. **`observeGitWorkspace` application use case and injected composition** —
   remove registry behavior from MCP.
5. **`safe_read` application service** — the first thin-adapter and future
   per-call-routing seam.

Schema-authority consolidation may proceed in parallel after cycle 1 because it
touches a different primary risk and directly improves agent DX.

Do not begin the default runtime flip until cycles 1-5 are complete and the G2
session-grant packet has frozen its authority model.

## 19. Final Campaign Narrative

Graft should behave like a local causal development service, not a collection
of repository-resident MCP state. The daemon owns managed observations and
derived state under Graft's home. The host grants authority; the invocation
selects a coordinate; the router identifies and activates the lawful workspace
automatically; the application use case performs the work; and MCP projects the
result for the agent. Durable history is a separate governed capability. The
source architecture should tell the same story: contracts define meaning,
operations own decisions, ports name required capabilities, secondary adapters
touch the host and causal substrate, composition roots wire the system, and API,
CLI, and MCP remain thin peers. The migration succeeds when the most common
agent read requires no workspace ceremony, leaves no debris in the target
repository, carries truthful authority and storage receipts, and can be invoked
through any primary surface without MCP owning the behavior.
