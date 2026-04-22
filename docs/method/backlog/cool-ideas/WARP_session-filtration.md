---
title: "Session filtration (accumulation-aware projections)"
legend: WARP
lane: cool-ideas
effort: L
requirements:
  - "Observation cache (shipped)"
  - "Session tracking (shipped)"
  - "Budget governor with projection decisions (shipped)"
  - "Policy engine (shipped)"
acceptance_criteria:
  - "Graft tracks the agent's accumulated observations (filtration) within a session"
  - "Subsequent reads of files in an already-outlined directory return higher detail than first reads"
  - "Projection detail level adapts based on what the agent has already seen, not just the request"
  - "A measurable reduction in redundant context-setting across repeated reads within a session"
  - "Filtration state is queryable (the agent can ask what detail level it would get)"
---

# Session filtration (accumulation-aware projections)

An observer's information grows monotonically over a session.
Graft should track what the agent has already seen and use that
to inform future projections.

If the agent already read the outline of parser/, a subsequent
safe_read of a file in parser/ could return MORE detail because
the outline context is already accumulated. Less context-setting
needed, more detail is valuable.

The agent's filtration has grown. Graft adapts.

This is the deepest OG insight applied to graft: the tool is
not about HOW MUCH to show. It's about what distinctions to
preserve, in what coordinate system, given what the agent
already knows.

See: OG-I (filtration model of accumulated observation).

## Implementation path

1. Model the agent's filtration state: for each file and directory,
   track what projection the agent has already seen (none, map,
   outline, range, content). This state already exists in the
   observation cache — this step formalizes it as a queryable
   filtration level.
2. Define filtration-aware projection rules: when the agent requests
   a file it has not seen before, apply the standard projection
   (likely outline). When the agent requests a file in a directory
   it has already outlined, escalate to content or a richer outline
   (more detail, fewer orientation headers).
3. Integrate with the policy engine: filtration state becomes an
   input to the projection decision. The policy engine already
   considers file size and session depth; add filtration level as
   a third axis.
4. Handle re-reads: when the agent re-reads a file it already read
   at content level, skip the preamble/orientation and return just
   the content. The agent already has the context.
5. Add a filtration query tool: let the agent ask "what detail level
   would I get for this file?" before committing a read. This
   composes with speculative-read-cost.
6. Test with a multi-step session: agent maps a directory, outlines
   a file, then reads a sibling file — the sibling should get richer
   detail than a cold read.

## Related cards

- **CORE_session-knowledge-map**: Knowledge map surfaces what the
  agent has seen. Filtration uses what the agent has seen to adjust
  projections. Same data source (observation cache), different
  consumers: knowledge map is a query for the agent, filtration is
  an input to the policy engine. They compose naturally but neither
  requires the other. Not a hard dependency.
- **WARP_semantic-drift-in-sessions**: Drift detection flags when
  re-reading might yield different understanding due to
  recontextualization. Filtration assumes accumulated knowledge is
  additive; drift detection warns when it might not be. They are
  complementary perspectives on session state. Not a hard dependency.
- **WARP_adaptive-projection-selection**: Adaptive projection
  selects the best view type for a file based on structural
  properties. Filtration adjusts detail level based on session
  history. They operate on orthogonal axes (structural properties
  vs. session state) and compose: adaptive selection picks the
  projection type, filtration adjusts the detail level within that
  type. Not a hard dependency.
- **CORE_auto-focus**: Auto-focus infers what symbol the agent
  wants. Filtration adjusts how much detail to show. Different
  concerns (what vs. how much). Not a hard dependency.
- **WARP_minimum-viable-context**: MVC sets the initial file set.
  Filtration adjusts detail within that set over time. Different
  lifecycle phases (initial vs. ongoing). Not a hard dependency.
- **CORE_cross-session-resume**: Resume provides structural diff
  from last session. Filtration operates within a single session.
  Resume could seed filtration state (mark files from the previous
  session as "already seen") but this is an enhancement, not a
  requirement.

## No dependency edges

All prerequisites (observation cache, session tracking, budget
governor, policy engine) are shipped. Filtration is a new decision
axis within the existing policy engine — no unshipped infrastructure
is required. No other card must ship first, and no downstream card
requires filtration as a hard prerequisite.

## Effort rationale

Large. The conceptual model is clear (monotone filtration over
observation history), but integrating it into the policy engine
requires careful design: (a) the filtration-aware projection rules
must avoid pathological cases (e.g., agent outlines directory A,
then reads file in A — should it get content? What if the file is
10,000 lines?), (b) the interaction with session depth decay and
budget limits adds complexity (filtration wants to show MORE, budget
wants to show LESS — how do they compose?), (c) testing requires
multi-step session scenarios that exercise the filtration progression.
The design surface is large even though the shipped infrastructure
covers the data plumbing.
