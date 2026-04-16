# Public API Contract

This document defines the semver-public package surface for
`@flyingrobots/graft`.

## Supported Module Path

The only semver-public JavaScript module path is:

```ts
import { ... } from "@flyingrobots/graft";
```

Deep imports into `src/`, `dist/`, or other package-internal paths are
not public contract. If external code imports those paths, it is opting
into implementation churn.

## Public Surface Families

The root package exposes four public families plus metadata.

### 1. Direct Repo-Local Integration

These are the preferred direct typed surfaces for in-process
integration:

- `createRepoWorkspace(...)`
- `RepoWorkspace`
- `ObservationCache`
- `CreateRepoWorkspaceOptions`
- `RepoWorkspace*Result` exported result types

Use this family when a host app wants governed repo-local reads without
MCP transport receipts.

### 2. Buffer-Native Editor Integration

These are the preferred direct typed surfaces for dirty-buffer editor
work:

- `createStructuredBuffer(...)`
- `StructuredBuffer`
- exported `Buffer*`, `Syntax*`, `Fold*`, `Selection*`, `Rename*`,
  `SemanticSummary*`, and related structured-buffer result/value types

Use this family when a host app wants editor-native parsing, spans,
rename previews, and diff/mapping on unsaved text.

### 3. Tool Bridge Surface

These exports are public, but they are bridge-shaped around Graft’s tool
contract rather than the preferred typed application services:

- `createRepoLocalGraft(...)`
- `callGraftTool(...)`
- `parseGraftToolPayload(...)`
- `MCP_TOOL_NAMES`
- `McpToolName`
- `McpToolResult`

Use this family when a host wants direct in-process access to the same
tool model used by MCP without paying transport overhead.

### 4. Host / Runtime Surface

These exports are public advanced host surfaces for embedding Graft
itself:

- `createGraftServer(...)`
- `startStdioServer(...)`
- `startDaemonServer(...)`
- `CreateGraftServerOptions`
- `GraftServer`
- `StartDaemonServerOptions`

Use this family when a host needs to boot or embed Graft runtimes,
rather than call repo-local or buffer-local services directly.

### 5. Metadata

- `GRAFT_VERSION`

This is public for version introspection and host diagnostics.

## What Is Not Public Contract

The following are not semver-public:

- deep imports into `src/**`
- deep imports into `dist/**`
- unexported implementation modules
- incidental file layout outside the documented root export families

The root package export surface is public. The implementation tree is
not.

## Stability Policy

Graft is still pre-1.0. That means the public API can change between
minor versions, but those changes must still be treated as externally
meaningful and reviewed explicitly.

Release classification rules:

- additive root exports or additive public option/result fields:
  release-worthy and normally `minor`
- bug fixes or hardening with no intended public API change: normally
  `patch`
- removing, renaming, or incompatibly changing documented root exports,
  option types, result types, or documented semantics: breaking change;
  after `1.0` this is `major`, and before `1.0` it must still be called
  out explicitly in the release packet and user-facing notes

For bridge-shaped outputs that remain schema-backed, the versioned
output schema contract still applies. `callGraftTool(...)` does not make
schema changes invisible just because the call stays in-process.

## Release Review Rule

Any release that changes the documented public API must answer these
questions explicitly:

- what public root exports changed
- whether the change is additive or breaking
- whether migration guidance is required for integrators

If a change does not affect the documented public API, it should be
classified as internal refactor or internal hardening instead.

