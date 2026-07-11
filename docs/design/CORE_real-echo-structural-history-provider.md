---
title: "Real Echo structural-history provider"
kind: design-packet
status: active
source_card: docs/method/backlog/up-next/CORE_real-echo-structural-history-provider.md
parent_design:
  - docs/design/CORE_structural-history-schema-and-echo-migration.md
  - docs/design/CORE_graft-echo-typescript-integration-requirements.md
echo_reference:
  - "echo@ebe8b6f7 docs/quickstart-local-contract-host.md: local contract host is the current release-grade app surface"
  - "echo@ebe8b6f7 crates/warp-cli/README.md: echo-cli exposes verify/bench/inspect/WSC causal-history commands, not a Graft observe command"
  - "echo@ebe8b6f7 xtask/src/main.rs: hello-echo and contract-path-release are executable witnesses, not a daemon API"
---

# Real Echo Structural-History Provider

## Hill

Graft can configure an Echo-backed `StructuralReadingPort` through the real
host boundary without opening git-warp against the project repository. The
first executable step is a process-backed `EchoKernelTransport` that carries
only app-safe application bytes to an Echo host command.

## Decision

Pivot to Echo now, but do it at the correct boundary.

Do not move the git-warp repository to `~/.graft/<project>/` as the strategic
answer. That plan still leaves Graft's normal read path dependent on Git
serialization, worktree lifecycle, and repo-local storage tricks. It remains a
reasonable fallback/import hygiene improvement, but not the primary migration.

Do not solve this with a daemon job queue around project Git as the strategic
answer. Queues and worker pools are useful for trusted resources, but here they
would preserve the wrong center of gravity. Echo is supposed to own causal
history; Git should feed imports and compatibility reads.

The chosen shape is:

```text
Graft use case
  -> StructuralReadingPort
  -> EchoStructuralHistoryClient
  -> EchoKernelTransport
  -> real Echo host command
```

The fake transport remains the fast deterministic harness. The real transport
is just another implementation of the same byte seam.

## Current Echo Surface

The local Echo checkout at `ebe8b6f7` has the contract-host machinery and
release witness documented in `docs/quickstart-local-contract-host.md`.
Application code can submit intents, observe outcomes, and request readings
through the app surface once a host is in place.

The current CLI does not expose a stable app-safe command that Graft can call
for structural-history observations. `echo-cli` is still a developer CLI for
snapshot verification, benchmarks, inspection, and WSC causal-history export.
`cargo xtask hello-echo` and `cargo xtask test-slice contract-path-release`
are witnesses, not a reusable daemon API.

Graft should therefore add a narrow command transport contract on its side now,
then point it at the real Echo command when Echo publishes that command.

## Command Transport Contract

The command transport is a process adapter for `EchoKernelTransport`.

Request on stdin:

```json
{
  "protocol": "graft.echo-kernel-command.v1",
  "method": "observeBytes",
  "payloadBase64": "..."
}
```

Successful response for byte methods:

```json
{
  "ok": true,
  "payloadBase64": "..."
}
```

Successful response for `kernelInfo`:

```json
{
  "ok": true,
  "kernelInfo": {
    "module": "echo-local-contract-host",
    "codecId": "graft-structural-history-le-v0"
  }
}
```

Command-level failure:

```json
{
  "ok": false,
  "error": {
    "code": "UNSUPPORTED_OPERATION",
    "message": "..."
  }
}
```

The command is not given a target repo root. If a real Echo host needs to know
which causal-history store to open, that belongs in host configuration or a
capability token outside the application byte request, not in a per-read Git
path.

## Authority Boundary

Allowed methods:

- `kernelInfo`
- `submitIntentBytes`
- `observeBytes`

Forbidden through this adapter:

- package installation;
- scheduler `tick`, `step`, `superTick`, or run-until-idle;
- trusted runtime start/stop/drain;
- WAL append, recovery, or direct mutation;
- project Git operations;
- git-warp opening or activation;
- target repository path routing.

## Acceptance Criteria

- `src/adapters/echo-command-kernel-transport.ts` implements
  `EchoKernelTransport` over `ProcessRunner`.
- Unit tests prove base64 request/response behavior and typed failure modes.
- Unit tests prove the adapter contract has no target repository path.
- The existing fake Echo transport, typed client, and Echo-backed
  `StructuralReadingPort` keep working unchanged.
- Production MCP/CLI contexts remain on existing defaults until the real Echo
  host command and parity gate are ready.
- Documentation states that `~/.graft/<project>/` git-warp storage is fallback
  hygiene, not the primary design.

## Playback Questions

1. Does the design remove project-repo Git from the primary concurrent read
   path?
2. Can the real transport replace the fake without changing
   `EchoStructuralHistoryClient` or `StructuralReadingPort`?
3. Does the adapter avoid trusted-host leakage?
4. Is the missing Echo command captured as an explicit integration gate rather
   than hidden by a fake?

## Non-goals

- Do not change Echo in this Graft slice.
- Do not wire the command transport into MCP or CLI defaults yet.
- Do not import git-warp history into Echo yet.
- Do not claim parity with git-warp.
- Do not claim retained evidence is restart-durable.
- Do not delete the git-warp fallback adapter.
