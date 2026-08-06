---
title: "Daemon observability REST API and Bijou operator dashboard"
feature: daemon
kind: leaf
legend: SURFACE
lane: cool-ideas
effort: L
requirements:
  - "Daemon status and control-plane projections (shipped)"
  - "Bijou daemon status first slice (shipped)"
acceptance_criteria:
  - "One daemon-owned snapshot reports semantic health, uptime, sessions, repositories, workspaces, monitors, scheduler pressure, worker pressure, and bounded recent failures"
  - "Health distinguishes healthy, degraded, and unhealthy service state from successful HTTP request handling"
  - "A versioned read-only HTTP API exposes the snapshot over the existing same-user local transport without enabling a TCP listener"
  - "MCP, CLI, and HTTP adapters consume shared application queries and contract schemas instead of calling one another"
  - "One versioned Graft-owned dashboard artifact binds the exact observability snapshot digest, semantic identities, reading order, freshness, health, actions, and capability requirements"
  - "Sibling Bijou and Geordi lowerers consume the same dashboard artifact and emit target maps and receipts without redefining Graft semantics"
  - "Cross-target tests compare semantic identities, labels, actions, input digests, and capability residuals without claiming terminal and browser pixel parity"
  - "The first operator dashboard is a Bijou TUI backed by deterministic view models and bounded refresh"
  - "Metrics and failure samples have bounded cardinality and do not expose repository paths, arguments, or raw error text as labels"
  - "Core and first-slice tests use a fake clock and deterministic snapshots instead of a live daemon, terminal loop, or browser"
---

# Daemon observability REST API and Bijou operator dashboard

## Why

The daemon already exposes useful system-wide state through `daemon_status`,
the repository, session, and monitor tools, and `/healthz`. The information is
spread across tool-shaped projections, however, and the existing `stats` tool
is session-local and requires a workspace binding. An operator cannot inspect
one bounded daemon-wide history of workload, latency, failures, and resource
pressure.

The current health surfaces can also answer different questions with the same
word. `/healthz` may successfully return `ok: true` while the composed daemon
status is degraded because the scheduler has recorded failures. Transport
liveness and semantic service health should be separate, explicit facts.

## Shape

### 1. Daemon-owned observability model

- maintain a bounded, daemon-lifetime metrics registry rather than aggregating
  mutable state independently in each adapter
- expose uptime, current gauges, cumulative counters, bounded latency
  distributions, and a bounded recent-failure ring
- preserve stable reason codes and timestamps for failures while keeping raw
  paths, tool arguments, and error text out of metric labels
- define semantic health as `healthy`, `degraded`, or `unhealthy`, with the
  reasons that produced that classification

### 2. Shared query and contract boundary

- define application queries for status, repositories, sessions, monitors,
  metrics, and recent failures
- validate their versioned response contracts at the adapter boundary
- keep MCP, CLI, and HTTP adapters as siblings over those queries; no
  adapter should tunnel through another adapter
- keep mutations on the existing workspace and monitor command paths instead
  of inventing REST-only control semantics

### 3. Versioned local REST API

- serve read-only `/api/v1/status`, `/api/v1/repos`, `/api/v1/sessions`,
  `/api/v1/monitors`, `/api/v1/metrics`, and `/api/v1/failures` resources over
  the daemon's existing same-user local transport
- retain the Unix-socket permission boundary on macOS and Linux and the named
  pipe boundary on Windows
- keep `/healthz` a cheap liveness/readiness probe while the status resource
  reports semantic service health
- make response ordering, pagination or bounds, timestamps, and empty-state
  behavior deterministic and documented

### 4. Portable dashboard artifact

- derive one versioned Graft-owned semantic dashboard artifact from an exact
  observability snapshot rather than making an MCP, HTTP, terminal, or browser
  response the render authority
- carry stable panel, metric, status, failure, and action identities; reading
  order; semantic label/value associations; freshness and health facts;
  capability requirements; and the exact source snapshot digest
- keep terminal geometry, pixel geometry, key handling, and browser transport
  outside the shared artifact
- require target-specific maps, capability residuals, output hashes, and
  receipts to bind every target back to the same semantic artifact

The target topology follows the completed Profunctor Page portability proof:

```text
Graft observability snapshot
  -> Graft dashboard artifact
    -> Bijou lowerer
      -> ui-scene-ir/1
        -> Surface and terminal receipt
    -> Geordi lowerer
      -> geordi-ir/1
        -> browser canvas and render receipt
```

Bijou and Geordi are sibling target owners. Neither target adapter calls the
other, and neither may redefine Graft health, freshness, metric, failure, or
control-action semantics.

### 5. Bijou operator surface

- build the first dashboard as a Bijou TUI with bounded refresh, visible
  staleness, accessible labels, and deterministic single-frame rendering
- keep the dashboard model independent from key handling and terminal effects
- lower the shared dashboard artifact through Bijou's shipped
  `ui-scene-ir/1` and `Surface` contracts with an inspectable target map and
  receipt
- leave confirmation-gated workspace and monitor mutations to the existing
  [Bijou daemon control-plane actions](./SURFACE_bijou-daemon-control-plane-actions.md)
  card

## Browser boundary

The completed
[Profunctor Page conformance corpus](https://github.com/flyingrobots/profunctor-optics-website/tree/main/test/fixtures/portable-targets/project-keep)
and its sibling
[Geordi](https://github.com/flyingrobots/geordi/tree/main/packages/profunctor-page)
and
[Bijou](https://github.com/flyingrobots/bijou/blob/main/packages/bijou/src/core/profunctor-page-target.ts)
lowerers establish the ownership precedent: one repository-owned semantic
artifact is consumed independently by both targets, and cross-target tests
compare shared identities, actions, token references, capabilities, input
digests, and residuals. Geordi owns the resulting pixel-oriented
`geordi-ir/1`; Bijou owns the terminal-oriented `ui-scene-ir/1` and `Surface`
path.

Graft should follow that proven boundary. The first delivery uses Bijou for the
TUI. A browser dashboard is a later Geordi target, gated on a bounded
Graft-to-Geordi profile, target map, receipt, deterministic conformance corpus,
and the browser security gateway. It does not wait for or require a Bijou DOM
renderer, and Graft does not own pixel rendering.

Any future browser adapter requires its own security design: an explicit
loopback gateway, short-lived authentication, origin checks, and a narrow
allowlist. It must not expose the daemon socket directly, bind a public TCP
listener by default, or inherit mutating authority merely because the read API
exists.

## Relationship to existing cards

- [Bijou daemon status live refresh](./SURFACE_bijou-daemon-status-live-refresh.md)
  owns bounded refresh behavior for the existing status slice.
- [Bijou daemon control-plane actions](./SURFACE_bijou-daemon-control-plane-actions.md)
  owns confirmation-gated workspace and monitor mutations over existing MCP
  commands.
- This card owns the missing daemon-wide observability core, semantic health
  model, shared query contracts, versioned local read API, and richer operator
  dashboard.

## Non-goals

- no public or remotely reachable HTTP listener by default
- no REST-only mutation model or duplicate control-plane authority
- no MCP-inside-HTTP or HTTP-inside-MCP adapter coupling
- no Bijou-inside-Geordi or Geordi-inside-Bijou adapter coupling
- no unbounded event, label, repository, session, or failure history
- no raw repository paths, command arguments, or error text in metric labels
- no target-specific terminal or pixel geometry in the shared dashboard
  artifact
- no browser, DOM, HTML, or cross-target pixel-parity claim in the first slice
- no governed repository writes

## Effort rationale

This is `L`, not `M`: the work spans daemon-owned state, public versioned
contracts, multiple adapters, health semantics, cardinality and security
limits, a semantic dashboard artifact, a Bijou TUI, target receipts,
deterministic tests, and operator documentation. The first implementation cycle
should split the observability/query core from the Bijou adapter and leave the
Geordi browser target and mutation work outside that cycle.
