---
title: "Semantic drift detection in agent sessions"
feature: projection
kind: leaf
legend: WARP
lane: cool-ideas
effort: M
requirements:
  - "Observation cache (shipped)"
  - "Session tracking (shipped)"
  - "Cross-file reference edges (shipped)"
acceptance_criteria:
  - "Graft tracks the reading path (sequence of files read) within a session"
  - "When an agent re-reads a file after reading structurally related files, graft flags potential interpretation shift"
  - "The holonomy detection identifies loops in the reading path where re-reading may yield different understanding"
  - "Drift warnings include the specific reading chain that may have shifted the agent's interpretation"
---

# Semantic drift detection in agent sessions

If an agent reads file A, then reads file B (which
recontextualizes A), then re-reads A — the agent's understanding
may have shifted. The loop through related files produces a
different interpretation on re-reading.

This is holonomy from OG-II: translating through a chain of
observers and returning to start does NOT return to the same
understanding.

Graft could track the reading path and flag: "You read server.ts
before reading policy.ts. Re-reading server.ts now would likely
change your interpretation of the policy middleware."

See: OG-II (loop defects / holonomy).

## Implementation path

1. Track the reading path: record each file/symbol read in
   chronological order within the session. The observation cache
   already stores this data — this step formalizes it as an ordered
   sequence.
2. Build the recontextualization graph: using cross-file reference
   edges, identify pairs of files where reading one structurally
   recontextualizes the other. File B recontextualizes file A if B
   contains symbols that A references (imports, calls, type
   dependencies).
3. Detect reading loops: when the agent re-reads a file, check
   whether any file read between the first and second read has a
   recontextualization relationship with the target file.
4. Compute drift likelihood: not all recontextualizations are equal.
   A file that imports a type from another file is weakly
   recontextualized by reading the type's implementation. A file
   that calls a function is strongly recontextualized by reading
   the function's body. Weight by structural relationship strength.
5. Emit drift warnings: when a re-read is detected and the
   intervening reads include recontextualizing files, warn the
   agent with the specific reading chain. Include the files, the
   structural relationships, and a suggestion to re-read with
   fresh interpretation.
6. Avoid false positives: suppress warnings for re-reads where the
   intervening files have no structural relationship to the target.
   The warning should fire only when recontextualization is
   structurally grounded.

## Related cards

- **WARP_session-filtration**: Filtration assumes accumulated
  knowledge is additive (monotone). Semantic drift warns when
  accumulated knowledge changes interpretation (non-monotone).
  They are complementary perspectives on session state — filtration
  is the optimistic view (you know more), drift detection is the
  cautionary view (you might know differently). Not a hard
  dependency — they use the same data (observation cache) but
  answer different questions.
- **CORE_session-knowledge-map**: Knowledge map shows what the
  agent has seen. Drift detection warns when what the agent has
  seen might have shifted its understanding. Same data source,
  different analysis. Not a hard dependency.
- **WARP_drift-sentinel**: Despite both having "drift" in the name,
  completely different features. Drift sentinel detects when docs
  diverge from code (documentation freshness). Semantic drift
  detects when an agent's understanding shifts during a reading
  session (holonomy). No overlap, no dependency.
- **CORE_structural-session-replay**: Replay renders the session's
  reading path as a navigable walkthrough. Drift detection analyzes
  the reading path for interpretation shifts. Replay could annotate
  drift points ("here is where your understanding likely shifted"),
  but neither requires the other.
- **CORE_auto-focus**: Auto-focus infers what the agent wants to
  read next. Drift detection warns that re-reading might yield a
  different understanding. Different concerns (intent inference vs.
  interpretation warning). Not a hard dependency.

## No dependency edges

All prerequisites (observation cache, session tracking, cross-file
reference edges) are shipped. Drift detection is a new analysis
layer over existing session data and structural edges. No other
card must ship first, and no downstream card requires drift
detection as a hard prerequisite.

## Effort rationale

Medium. The reading path is already tracked in the observation
cache. The recontextualization graph can be derived from shipped
cross-file reference edges. The main complexity is: (a) defining
what constitutes a structurally meaningful recontextualization
(not every import is significant), (b) calibrating drift likelihood
to avoid noisy false positives, and (c) designing warnings that
are actionable rather than annoying. Not L because the scope is
bounded (one analysis over one data source) and the structural
infrastructure is all shipped.
