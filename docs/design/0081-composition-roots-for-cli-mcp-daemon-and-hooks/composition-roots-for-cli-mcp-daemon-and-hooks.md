---
title: "composition roots for cli mcp daemon and hooks"
legend: "CORE"
cycle: "0081-composition-roots-for-cli-mcp-daemon-and-hooks"
source_backlog: "docs/method/backlog/up-next/CORE_composition-roots-for-cli-mcp-daemon-and-hooks.md"
---

# composition roots for cli mcp daemon and hooks

Source backlog item: `docs/method/backlog/up-next/CORE_composition-roots-for-cli-mcp-daemon-and-hooks.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

MCP entrypoint wiring becomes a real composition root instead of a mixed
application shell: tool registration, access policy, workspace-runtime
assembly, and persisted-local-history policy/view shaping each live in
dedicated modules, so the remaining CLI/daemon/hooks work can follow the
same pattern without first untangling MCP again.

## Playback Questions

### Human

- [ ] Can a reviewer point to explicit modules for MCP tool registration,
      daemon/tool access policy, workspace runtime assembly, and local
      history projection/policy instead of reading `server.ts`,
      `workspace-router.ts`, and `persisted-local-history.ts` as one
      mixed orchestration seam?

### Agent

- [ ] Can the MCP server and workspace router delegate composition work
      to focused helpers while preserving the same repo-local behavior
      under typecheck, lint, and the existing MCP/library test slices?
- [ ] Is `persisted-local-history.ts` reduced to store/orchestration
      responsibilities, with summary/activity projection and continuity
      policy/event construction extracted into pure helper modules?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: each entrypoint root should
  be inspectable by reading one thin assembly module plus the helper it
  delegates to, not a thousand-line mixed file.
- Non-visual or alternate-reading expectations: module names should
  communicate responsibility directly so agent and human readers can
  navigate by filename instead of full-file scanning.

## Localization and Directionality

- Locale / wording / formatting assumptions: internal-only architecture
  language; no user-facing locale impact in this slice.
- Logical direction / layout assumptions: left-to-right code reading;
  no UI layout changes.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: which module owns
  registration, access control, runtime assembly, projection, and
  policy; adapters should not hide those seams inside large files.
- What must be attributable, evidenced, or governed: cross-surface
  behavior must remain evidenced by the existing MCP/library tests while
  these seams move.

## Non-goals

- [ ] Do not claim CLI, daemon, and hook composition roots are finished
      in this first pass.
- [ ] Do not redesign capability behavior or transport semantics while
      moving assembly code.

## Backlog Context

Split entrypoint wiring from application services. CLI, MCP stdio, daemon transport, and hook scripts should each become explicit composition roots that assemble the same underlying services rather than carrying overlapping orchestration logic.
