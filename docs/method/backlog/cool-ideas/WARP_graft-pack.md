---
title: "graft pack"
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "Session tracking (shipped)"
  - "State save/load (shipped)"
  - "Observation cache (shipped)"
  - "causal_attach tool (shipped)"
acceptance_criteria:
  - "A single graft-pack artifact contains session state, touched file list, decision log, and suggested next reads"
  - "A receiving agent can load a graft-pack and resume work without re-reading already-observed files"
  - "Round-trip test: pack from session A, load into session B, verify session B has equivalent context"
  - "Pack format is serializable to a single file (JSON or NDJSON)"
---

# graft pack

One-shot handoff bundle: state + touched files + decisions + next
reads. For passing context between agents or sessions in a single
artifact.

## Implementation path

1. Define the `GraftPack` schema: session metadata (ID, HEAD SHA,
   timestamp), observation list (files read with line ranges),
   symbol inspection log, decision log (tools called with key
   results), causal workspace identity, budget consumed, and
   suggested next reads (unread files in hot directories).
2. Add a `graft_pack` MCP tool that snapshots the current session
   into a single JSON artifact. Internally queries the observation
   cache, session tracker, and causal workspace.
3. Add a `graft_unpack` MCP tool that ingests a pack artifact,
   pre-populates the observation cache and session state, and
   attaches to the same causal workspace via `causal_attach`.
4. Suggested next reads: analyze the packed session's observation
   coverage against the current file tree. Files in directories
   the original session touched but didn't read become suggestions.
5. Wire pack generation into session lifecycle: auto-generate on
   context limit, explicit agent request, or graceful shutdown.
6. Validate with round-trip test: pack session A, start session B,
   unpack, verify equivalent structural awareness and observation
   state.

## Related cards

- **CORE_agent-handoff-protocol**: Handoff is the protocol; graft
  pack is the artifact format. Handoff defines WHAT gets transferred
  and WHEN; graft pack defines HOW it's serialized. They are
  complementary and could share implementation — handoff could
  produce a graft pack as its payload. Neither is a hard dependency
  on the other: handoff can produce ad-hoc JSON, and packs can
  exist without a formal handoff protocol.
- **CORE_cross-session-resume**: Resume loads YOUR OWN prior state.
  Graft pack serializes state for SOMEONE ELSE. Resume uses
  `state_load` (shipped); packs use the same data but add
  decision logs and suggested next reads. Independent builds.
- **CORE_session-knowledge-map**: Knowledge map answers "what do
  I know?" for the current agent. A graft pack serializes that
  same answer for consumption by a different agent. If knowledge
  map ships first, pack generation becomes trivially derived from
  its output. Not a hard dependency.

## No dependency edges

All prerequisites are shipped. The graft pack is a serialization
format over existing observation cache, session state, and causal
workspace data. No other card must ship first, and no downstream
card gates on graft pack.

## Effort rationale

Medium. The schema design and observation-cache query for pack
generation are straightforward (S). The unpack side — pre-populating
session state, handling stale observations (file changed since pack
was created), validating causal workspace continuity — adds
integration surface. The round-trip fidelity requirement (session B
has equivalent context to session A) requires careful testing. These
concerns push from S to M.
