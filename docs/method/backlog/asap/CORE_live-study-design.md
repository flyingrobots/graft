# Live before/after study on real sessions

Turn graft from a smart thesis into defensible infrastructure.
Not just "burden dropped" — a 5-metric study:

## Metrics

1. **Burden dropped** — total context bytes per session, graft vs
   ungoverned. Receipt mode + Blacklight provide the data.
2. **Task completion** — did the agent actually finish the task?
   Governed sessions must not have worse completion rates.
3. **Re-read churn** — number of re-reads per file per session.
   Cache hits should show dramatic reduction.
4. **Refusal recovery** — when graft refuses a file, does the agent
   recover smoothly (use outline, try read_range) or get stuck
   (retry the same read, ask the user for help)?
5. **Governor evasion** — do agents route around the governor in
   ugly ways? (e.g., using Bash to cat files, asking the user to
   paste file contents, splitting reads into many small ranges to
   reconstruct the whole file)

## Study design

- Paired sessions: same task, one with graft, one without
- Real tasks on real codebases (not toy examples)
- Multiple agent types if possible (Claude, GPT, Gemini)
- Minimum 20 sessions per condition for statistical power
- Graft's own development is the first test subject

## Data sources

- Receipt mode (_receipt blocks in API transcripts)
- Blacklight session analysis
- NDJSON decision logs
- Manual annotation for task completion and evasion

## Prerequisites

- Graft published and installable (0.1.0)
- Receipt mode working (done)
- Blacklight can parse _receipt blocks (needs work)

Effort: L (study design is M, execution is L)
