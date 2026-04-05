# Cycle 0020: Study Infrastructure

## Hill

Check the last freeze gate box: generate all handoff artifacts so
the protocol can be frozen and the shadow dry run can begin.

## Deliverables

1. **Task cards** — frozen YAML per §6.2 schema for P01–P05
2. **Task pair calibration notes** — why A and B are comparable
3. **Prompt frame** — identical system prompt preamble for both
   conditions
4. **Randomization schedule** — seeded PRNG, blocked by category
5. **Acceptance harnesses** — per-task pass/fail scripts
6. **Analysis notebook stub** — loads data, runs primary +
   guardrail + secondary, produces tables

## Non-goals

- Transcript parser / metric scripts (needs real transcripts
  from shadow dry run to validate against)
- Evasion detector (same — needs real data)
- Session runner automation (manual for pilot, automate later)
- Running any actual study sessions

## Playback questions

**Human**: Can I look at the task cards and know exactly what to
tell the agent, what repo state to start from, and how to judge
success?

**Agent**: Can I run the acceptance harness and get a binary
pass/fail without ambiguity?

Effort: M (design + scripting cycle)
