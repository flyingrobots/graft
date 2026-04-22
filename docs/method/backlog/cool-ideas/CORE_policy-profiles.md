---
title: "Policy profiles"
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "Budget governor (shipped)"
  - "Policy engine (shipped)"
  - ".graftrc configuration support (shipped)"
acceptance_criteria:
  - "At least three named profiles are available: balanced, strict, and feral"
  - "Profiles configure thresholds, ban lists, and outline verbosity"
  - "Profiles are switchable per session via CLI flag or per project via .graftrc"
  - "Custom profiles can be defined by users in .graftrc"
  - "The active profile name is visible in governor receipts"
  - "Profile switching mid-session takes effect on the next tool call without restart"
---

# Policy profiles

Named policy presets: balanced / strict / feral. Different thresholds,
different ban lists, different outline verbosity. Switchable per
session or per project via .graftrc or CLI flag.

## Implementation path

1. Define a `PolicyProfile` interface with all configurable governor knobs (line threshold, byte cap, session depth decay rate, ban list, outline verbosity level).
2. Ship three built-in profiles:
   - **balanced** — current defaults (150 lines, 12 KB, standard decay).
   - **strict** — aggressive outlines, lower thresholds, tighter session cap. For small-context agents or CI pipelines.
   - **feral** — minimal enforcement, high thresholds, no ban list. For exploratory work or large-context models.
3. Wire profile selection into `.graftrc` (`profile: "strict"`) and CLI flag (`--profile strict`).
4. Allow `.graftrc` to define custom profiles under a `profiles:` key, each overriding any subset of knobs.
5. Expose the active profile name in governor receipts so agents and humans know which regime is active.
6. Ensure mid-session profile switching works cleanly — the policy engine picks up the new profile on the next decision without requiring session restart.

## Related cards

- **CORE_lagrangian-policy**: The Lagrangian engine replaces the threshold-based policy with a continuous cost functional. Profiles would become named weight vectors in the Lagrangian rather than discrete threshold bundles. These are independent builds — profiles work with the current engine, and profiles-as-weight-vectors are a natural extension if the Lagrangian ships. Not a hard dependency in either direction.
- **CORE_policy-playground**: Playground lets agents preview what a read would do under the current policy. Profiles change which policy is active. They compose naturally but neither requires the other.
- **CORE_self-tuning-governor**: The tuning engine could suggest which profile fits a project best, or suggest adjustments to a custom profile. Complementary but independent.
- **WARP_adaptive-projection-selection**: Adaptive projection selects the best projection per file structurally. Profiles set the governor envelope within which projections operate. Independent axes.

## No dependency edges

Standalone. All prerequisites are shipped. No other card requires policy profiles as a hard prerequisite — profiles are a configuration surface, not a capability gate.

## Effort rationale

Medium. The policy engine and .graftrc parsing are shipped, but defining the profile schema, wiring three built-in profiles, enabling mid-session switching, and testing the interaction between profiles and existing governor behavior is non-trivial. Not just config — the profile abstraction needs to cleanly compose with session depth decay, ban lists, and all existing governor knobs.
