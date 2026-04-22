---
title: "Auto-focus — intent-driven read targeting"
feature: policy
kind: leaf
legend: CORE
lane: cool-ideas
effort: L
requirements:
  - "Budget governor (shipped)"
  - "file_outline tool (shipped)"
  - "graft_map tool (shipped)"
  - "Session tracking (shipped)"
  - "Observation cache (shipped)"
  - "code_show tool (shipped)"
acceptance_criteria:
  - "A `focus: 'auto'` mode is available on read tools"
  - "The governor infers the target symbol or range from the agent's request context"
  - "Auto-focused reads return only the inferred relevant content, not the full file"
  - "Auto-focus produces equivalent or better precision than explicit manual targeting"
  - "When inference confidence is low, auto-focus falls back to outline rather than guessing"
---

# Auto-focus — intent-driven read targeting

`focus: 'auto'` — intent-driven auto-focus. The governor infers which
symbol or range the agent actually needs based on the request context,
instead of requiring explicit targeting.

## Implementation path

1. Define the inference interface: given a file path and the agent's recent session context (last N tool calls, symbols mentioned), produce a target symbol or line range
2. Build heuristics for inference: if the agent just searched for symbol X and now reads the file containing X, auto-focus to X's definition
3. Use the observation cache to track the agent's navigation path — recent outlines, searches, and code_show calls provide strong signal for what the agent cares about
4. Integrate with the policy engine: auto-focus is a projection decision, so it should flow through the same policy pipeline as outline/content/refused
5. Add confidence scoring: when inference is ambiguous (multiple candidate symbols), fall back to outline rather than picking wrong
6. Wire `focus: 'auto'` as an option on `safe_read`, `code_show`, and `read_range`

## Related cards

- **CORE_session-knowledge-map**: Knowledge map tells the agent what it already knows; auto-focus uses the same observation data to infer what it wants next. Not a hard dependency — auto-focus can query the observation cache directly — but they share the same data source.
- **CORE_horizon-of-readability**: When auto-focus identifies a target but the file is irreducibly complex, horizon-of-readability determines that no further focusing is possible. Complementary but independent — auto-focus works without horizon detection.
- **WARP_minimum-viable-context**: MVC pre-populates structurally relevant files; auto-focus narrows within a single file. Different granularity levels of the same "give the agent only what it needs" principle.
- **CORE_conversation-primer**: Primer provides initial orientation; auto-focus provides ongoing targeting during the session. Different lifecycle phases.
- **WARP_session-filtration**: Filtration adapts projection detail based on accumulated knowledge; auto-focus targets specific symbols based on inferred intent. Both use observation history but for different purposes.

## No dependency edges

All prerequisites are shipped. Auto-focus is a new inference layer on top of existing observation cache and policy engine. No other card must ship first. No other card is blocked by this — downstream cards like session-knowledge-map or conversation-primer could benefit from auto-focus but do not require it.

## Effort rationale

Large. The core challenge is inference quality — determining what the agent actually wants from session context is an AI-adjacent problem. Building heuristics that are reliable enough to beat explicit targeting requires careful design, extensive testing across diverse agent workflows, and a confidence/fallback system. The integration surface (wiring into multiple tools and the policy pipeline) adds further scope.
