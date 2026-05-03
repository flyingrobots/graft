---
title: "Capability matrix truth for CLI operator commands"
legend: "SURFACE"
cycle: "SURFACE_capability-matrix-truth"
source_backlog: "docs/method/backlog/asap/SURFACE_capability-matrix-truth.md"
---

# Capability matrix truth for CLI operator commands

Source backlog item: `docs/method/backlog/asap/SURFACE_capability-matrix-truth.md`
Legend: SURFACE

## Hill

Make the three-surface capability matrix truthful about top-level CLI
operator/lifecycle commands without adding runtime behavior or broad CLI
parity.

## Playback Questions

### Human

- [x] Can a human tell the difference between direct CLI/MCP peer
      commands, composed CLI operator/lifecycle commands, and
      intentionally API+MCP-only agent/control-plane tools?
- [x] Does the `daemon_status` row tell the truth that `graft daemon
      status` exists as a composed CLI operator surface?
- [x] Is it clear that `graft serve`, `graft serve --runtime daemon`, and
      `graft daemon` are host/runtime launch commands documented in the
      CLI guide rather than capability rows?

### Agent

- [x] Does the capability registry expose `daemon_status` on API, CLI,
      and MCP with `composed_cli_operator` posture and `daemon status` as
      its CLI path?
- [x] Do release-gate tests fail if the documented matrix hides a
      composed CLI operator command as MCP-only?
- [x] Do tests prove the intentionally API+MCP-only tools were not
      converted into direct CLI peers?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: matrix rows must be
  readable without knowing implementation internals.
- Non-visual or alternate-reading expectations: taxonomy terms must be
  explicit text, not implied by table position alone.

## Localization and Directionality

- Locale / wording / formatting assumptions: English repo docs; command
  paths remain literal CLI tokens.
- Logical direction / layout assumptions: left-to-right Markdown table
  layout.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: registry posture,
  matrix row, and release-gate assertions must agree mechanically.
- What must be attributable, evidenced, or governed: `daemon_status`
  truth must point to the existing CLI command without inventing new
  behavior.

## Non-goals

- [ ] Add new runtime behavior.
- [ ] Add direct CLI peers for API+MCP-only agent/control-plane tools.
- [ ] Turn the capability matrix into an equality mandate across all
      three surfaces.
- [ ] Move pure host/runtime launch commands into capability rows.

## Backlog Context

The current three-surface capability matrix correctly models direct CLI
peer commands, API exposure, and MCP tools, but it can lie by omission for
top-level CLI lifecycle/operator commands that compose existing MCP/API
truth. The concrete witness is `graft daemon status`: the CLI command
exists and is tested, but the matrix row for `daemon_status` currently
says CLI = No.

Hill:
- make the truth model honest without chasing equal capability

Boundaries:
- do not add new runtime behavior
- do not add CLI peers for API+MCP-only tools
- keep MCP as the richest agent/control-plane surface
- keep API as stable host/library integration
- keep CLI focused on human/operator workflows and selected peer commands

Deliverable taxonomy:
1. direct peer capability surfaces
2. composed CLI operator/lifecycle commands
3. intentionally MCP/API-only agent/control-plane tools
