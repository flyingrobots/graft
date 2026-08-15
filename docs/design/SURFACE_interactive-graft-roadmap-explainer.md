---
title: "Interactive Graft roadmap explainer"
legend: "SURFACE"
cycle: "SURFACE_interactive-graft-roadmap-explainer"
status: "active"
---

# Interactive Graft roadmap explainer

## Sponsors

- Human: James
- Agent: Codex

## Hill

A newcomer can open one static website, follow a real `file_outline` request
through Graft's present and intended architecture, and then explain why Graft
has two legitimate roadmaps, where work stands on each, how their dependencies
differ, and where the programs eventually converge.

The site must make the two planning altitudes explicit:

1. the short Echo-hosting and structural-history campaign centered on issue
   #228; and
2. the broader G0-G12 daemon-managed workspace product program.

It must not flatten those programs into one invented queue. Native GitHub
blocker edges, documented sequencing, task membership, and inferred
architectural convergence are different evidence classes and must remain
visually distinguishable.

## Canonical example

The running example is:

```text
file_outline("src/mcp/server.ts")
```

Today, the governed operation can analyze immutable admitted bytes through
`AdmittedWorkspaceReadView`, but production composition still supplies
`LiveWorkspaceReadSource`. Issue #228 changes the causal plumbing around that
same user-visible operation: Echo retains an unknown-workspace-basis request
before observation, retains the settlement before analysis, and recovers the
same result after restart without filesystem or git-warp reads.

The example then projects into the larger roadmap: G3.6 names `file_outline`
as one safe multi-workspace read surface, G4 makes derived outlines cacheable
without scope leaks, and G6-G7 make retained structural history selectable and
truthful.

### Foils

- **Authority-seam foil:** `AdmittedWorkspaceReadView` proves that Graft can
  consume admitted bytes; it does not prove that production obtains those
  bytes through Echo.
- **Cutover foil:** issue #230 is a later one-time git-warp migration. It is not
  the first retained observation and must not be presented as current work.

## Evidence hierarchy

The snapshot date is 2026-08-15. Claims use this precedence:

1. current Git and source for implemented behavior and branch state;
2. `docs/BEARING.md` and the active #228 design packet for execution gravity;
3. live GitHub issue, milestone, pull-request, and native dependency state;
4. the managed-workspace roadmap for G0-G12 sequencing and release promises;
5. issue bodies and historical notes only when they agree with newer evidence.

Known drift is evidence, not noise:

- G0's six task issues are closed while its milestone remains open;
- G1 is described as in progress in the roadmap while all eight task issues
  remain open;
- issue #228 still says the request binds an expected workspace basis even
  though the newer design requires an unknown workspace-content basis; and
- the Echo-native milestone aggregate reports five open items while direct
  issue enumeration exposes #230 and #231.

## Information architecture

The explainer follows progressive disclosure:

1. a sixty-second orientation;
2. the canonical `file_outline` example in full;
3. the cast and present architecture;
4. why two roadmaps exist;
5. the two interactive task DAGs;
6. claims versus executable evidence;
7. the audit method, including dead ends and drift; and
8. convergence and a concrete maturity checklist.

Every major section opens with its argument and closes by restating the
conclusion. The canonical example recurs through every architectural layer.

## Graph contract

Both graphs use a Sugiyama layered layout. The implementation must expose the
algorithm as four inspectable stages: cycle rejection, longest-path layering,
barycentric crossing reduction, and coordinate assignment.

### Echo campaign graph

The campaign view includes native dependencies across Graft and hello-echo,
plus visually distinct documented-only context. A focused view expands #228
into its causal proof tasks:

```text
unknown-basis contract
  -> retained request
  -> authorized observation
  -> retained settlement
  -> production decoder
  -> file_outline analysis
  -> restart recovery
  -> zero filesystem and git-warp rereads
```

### Managed-workspace graph

The goalpost view shows the normative G0-G12 critical path and three parallel
branches. The task view expands all 105 GitHub issues. Edges inside a goalpost
mean documented slice order, not native GitHub blockers; goalpost edges mean
roadmap sequencing.

### Edge evidence

| Edge class | Meaning | Visual treatment |
|---|---|---|
| Native blocker | Live GitHub dependency | solid, strongest |
| Roadmap sequence | Normative design-document order | solid, secondary |
| Slice order | Ordered PR-sized slices within a goalpost | thin |
| Architectural convergence | Documented relationship without a native edge | dashed |
| Stale or completed prerequisite | Retained for explanatory context | dotted |

## Interaction and accessibility

- Toggle campaign/goalpost and expanded-task views.
- Pan, zoom, fit, search, and filter by status.
- Select nodes by pointer or keyboard to inspect status, milestone, evidence,
  dependencies, and source links.
- Preserve meaning without color through labels, shapes, edge patterns, and a
  textual dependency list.
- Provide a tabular, render-independent account beside every sequence or flow
  diagram.
- Respect reduced-motion and support narrow screens without hiding content.

## Acceptance criteria

- [ ] A static build opens without a server-specific API or live GitHub call.
- [ ] The companion explainer source has complete YAML frontmatter with James
      as author.
- [ ] The site teaches the full canonical example before introducing roadmap
      abstractions.
- [ ] Both DAGs are rendered with a verified Sugiyama layout.
- [ ] The Echo graph matches current native blocker relationships.
- [ ] The managed graph contains exactly 105 milestone task issues and the
      documented critical and parallel branches.
- [ ] Status counts show six closed managed tasks, 99 open managed tasks, and
      describe #228 as design-complete but implementation-unstarted.
- [ ] Every graph interaction has a keyboard and textual equivalent.
- [ ] Edge evidence classes cannot be mistaken for one another.
- [ ] The canonical Mermaid sequence renders successfully through `mmdc` and
      has an immediate collapsible caption plus explanatory table.
- [ ] Source provenance includes snapshot date, Git SHAs, files, issues,
      milestones, and dependency endpoints.
- [ ] The production build, repository lint, link/data checks, and visual QA
      pass.

## Playback questions

### Human playback

1. Can I explain in one sentence why there are two roadmaps?
2. Can I find #228 and identify the first unfinished implementation task?
3. Can I distinguish a GitHub blocker from a design-document sequence?
4. Can I see that G0 is task-complete while G1 is only partially implemented?
5. Can I trace `file_outline` from today's live read to retained replay and
   onward to the managed-history product milestones?

### Agent playback

1. Do graph node and edge counts match the checked-in snapshot and roadmap?
2. Does the graph reject cycles rather than silently laying them out?
3. Are status, issue, milestone, and source links derived from one data model?
4. Can the built site run without GitHub, filesystem, or build-tool access?
5. Do automated checks catch a missing node, invalid edge, broken source link,
   or non-Sugiyama layout marker?

## Test strategy

1. Generate managed task data from the authoritative roadmap and a small,
   checked-in live-tracker snapshot.
2. Assert exact node counts, issue-number coverage, edge endpoints, acyclicity,
   status counts, and current-node identity.
3. Render the Mermaid source with `mmdc` and check in the resulting SVG.
4. Build the static site with relative asset URLs.
5. Exercise view toggles, node selection, search, zoom, keyboard focus, and
   responsive layout in a real browser.
6. Run `git diff --check`, `pnpm lint`, and the explainer-specific checks.

## Explicit non-goals

- changing either roadmap, milestone, issue, or dependency edge;
- implementing #228 or any G0-G12 slice;
- claiming the two roadmaps are already unified;
- inventing native GitHub dependencies for G1-G12;
- adding live tracker mutation or authenticated application state;
- replacing `BEARING.md` or the design packets as planning authority;
- turning the explainer into a general roadmap-management product; and
- making deployment access public without explicit approval.

