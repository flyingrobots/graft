---
title: "Real Echo structural-history provider"
feature: core
kind: architecture
legend: CORE
lane: up-next
priority: 0
effort: L
requirements:
  - "Echo is the primary structural-history substrate after the migration gate"
  - "git-warp remains only a provenance-preserving import/fallback source"
  - "Concurrent Graft sessions must not serialize on project-repo Git state"
  - "App-facing Echo access must not expose trusted-host authority"
acceptance_criteria:
  - "Graft can configure a real Echo host command behind EchoKernelTransport"
  - "The real-host path moves only application dispatch and observation bytes"
  - "StructuralReadingPort can consume Echo-native readings without opening git-warp"
  - "The fake Echo transport remains the fast deterministic unit harness"
  - "Provider selection keeps git-warp fallback explicit until parity is proven"
---

# Real Echo structural-history provider

## Hill

Graft gets a real Echo-backed structural-history provider path that can be
selected without opening git-warp or mutating the target repository's `.git`.
The first slice is the host boundary: Graft can speak the same app-safe byte
transport to a real Echo command that the fake transport already implements in
unit tests.

## Why Now

The workspace-activation bug exposed the same architectural smell from another
angle: Graft still lets mutable process-local state choose which repository a
tool sees. Moving git-warp to `~/.graft/<project>/`, queuing Git jobs, or
allocating per-session git worktrees would reduce contention, but those designs
still put Git at the center of the runtime.

The stronger migration is to make Echo the resource boundary:

```text
Graft tool/use case
  -> StructuralReadingPort
  -> Echo structural-history client
  -> app-safe Echo host transport
  -> Echo-owned causal history
```

Git then becomes an importer and fallback compatibility source, not the
arbiter of concurrent sessions.

## Design Pressure

The current Echo checkout has a release-grade local contract-host witness but
not a stable Node package or `echo-cli observe` command for Graft to invoke
directly. Graft should therefore define the command transport it needs without
pretending that `echo-cli` already has a Graft operation.

The transport is intentionally generic: one command receives a JSON request on
stdin containing method name and base64 application bytes, then returns JSON
containing either kernel info or base64 response bytes. It does not receive a
target repository path, a git ref, scheduler controls, WAL mutation handles, or
package-install authority.

## Acceptance

- Add a Graft design packet for the real Echo provider pivot.
- Add an `EchoKernelTransport` adapter backed by a process command.
- The command adapter sends only:
  - `kernelInfo`
  - `submitIntentBytes`
  - `observeBytes`
- The adapter fails closed on process failure, malformed JSON, command-level
  errors, missing base64 payloads, or malformed kernel info.
- Unit tests prove:
  - request bytes are base64-wrapped and returned bytes are decoded;
  - `kernelInfo` is command-backed;
  - command failures throw typed errors;
  - no target repository path is part of the adapter contract.
- Do not wire this into production MCP/CLI defaults yet.
- Do not modify Echo in this Graft slice.

## Non-goals

- Do not implement an Echo daemon inside Graft.
- Do not move git-warp storage to `~/.graft/<project>/` in this slice.
- Do not build a job queue around git-warp as the primary fix.
- Do not change public Graft output.
- Do not claim durable Echo retention until the real Echo host command and
  retained-evidence checks prove it.
- Do not delete git-warp imports or fallback behavior before parity.
