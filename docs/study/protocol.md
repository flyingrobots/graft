# Graft Effectiveness Study Protocol

**Version:** 1.0
**Status:** Draft
**Date:** 2026-04-04

## 1. Research question

Does graft reduce context burden in coding agent sessions without
degrading task completion?

## 2. Hypotheses

Pre-registered. All hypotheses are falsifiable and will be evaluated
regardless of direction.

**H1 (burden):** Graft-governed sessions produce lower total context
bytes returned to the agent than ungoverned sessions on the same task.

**H2 (completion):** Graft-governed sessions have equal or better
task completion rates compared to ungoverned sessions.

**H3 (churn):** Graft-governed sessions have fewer re-reads of the
same file per session.

**H4 (recovery):** When graft refuses a file or returns an outline,
the agent successfully uses the alternative path (read_range, outline
navigation) at least 70% of the time.

**H5 (evasion):** Graft-governed sessions show no systematic increase
in alternative read strategies (Bash cat, user paste requests,
range-reconstruction patterns).

## 3. Design

**Type:** Within-subject paired design. Each task is run twice: once
with graft (governed), once without (ungoverned). Pairing controls
for task difficulty and codebase complexity.

**Conditions:**
- **Governed:** Graft MCP server active. Agent has access to all 10
  graft tools. Claude Code hooks active (PreToolUse + PostToolUse).
- **Ungoverned:** No graft. Agent uses native Read, Bash, Grep, etc.
  Standard Claude Code configuration.

**Counterbalancing:** For each task, randomly assign which condition
runs first to control for order effects (e.g., agent "learning" the
codebase in the first run and benefiting in the second).

**Blinding:** Not possible — the agent knows whether graft tools are
available. This is a known limitation.

## 4. Metrics

### M1: Context burden (bytes)

**Definition:** Total bytes returned to the agent across all tool
responses in the session.

**Governed source:** Sum of `_receipt.cumulative.bytesReturned` from
the final tool call in the session.

**Ungoverned source:** Sum of content length across all Read, Bash,
Grep tool responses in the API transcript. Requires Blacklight
parsing or API-level logging.

**Unit:** Bytes. Report as KB for readability.

### M2: Task completion

**Definition:** Binary (0/1). Did the agent produce output that
meets the task's pre-defined acceptance criteria?

**Source:** Human evaluation against acceptance criteria. Each task
defines specific, observable criteria (e.g., "tests pass," "file
exists with correct content," "PR created with required changes").

**Evaluator:** The task author, who does not know which session
produced the output until after evaluation (single-blind where
feasible).

### M3: Re-read churn

**Definition:** Number of times the same file path appears in
read-type tool calls within a session, minus 1 (first read is not
churn).

**Governed source:** Count from NDJSON decision log
(`.graft/logs/decisions.ndjson`), grouped by path. Or from
`_receipt` data: count `safe_read` calls per path where
`reason != CHANGED_SINCE_LAST_READ`.

**Ungoverned source:** Count from API transcript: number of Read
tool calls per file path.

**Unit:** Re-reads per file per session (mean and max).

### M4: Refusal recovery rate

**Definition:** When graft returns `projection: "outline"` or
`projection: "refused"`, does the agent's next action use the
provided information productively?

**Productive actions after outline:**
- `read_range` targeting a jump table entry
- Proceeding with the task using outline information
- Asking a clarifying question about a specific symbol

**Unproductive actions after outline:**
- Re-reading the same file with native Read
- Using Bash to cat the file
- Asking the user to paste the file

**Source:** Sequence analysis of tool calls in the API transcript.
Requires manual annotation for ambiguous cases.

**Unit:** Percentage of outline/refusal responses followed by a
productive action.

### M5: Governor evasion

**Definition:** Count of tool calls that appear to circumvent
graft's governance.

**Evasion patterns:**
- `Bash` with `cat`, `head`, `tail`, `less`, `more` on a file
  that graft would govern
- Multiple sequential `read_range` calls that reconstruct a file
  (total lines requested > file length × 0.8)
- Agent asking the user to paste file contents
- Agent using `Grep` with excessive context lines (`-C 999`)

**Source:** Pattern matching on API transcript tool calls. Can be
partially automated.

**Unit:** Evasion events per session.

## 5. Task bank

Each task must specify:
- **Codebase:** Repository and commit/branch
- **Prompt:** Exact text given to the agent
- **Acceptance criteria:** Observable, binary conditions
- **Expected difficulty:** S/M/L
- **Expected read profile:** How many files, how large

### Starter tasks (graft's own codebase)

| ID | Task | Acceptance criteria | Difficulty |
|----|------|---------------------|------------|
| T1 | Add a new reason code GRAFTIGNORE_MATCH | Tests pass, code compiles, reason code in enum | M |
| T2 | Fix a bug: run_capture with tail=0 | Existing test modified to cover edge case, test passes | S |
| T3 | Add Rust language detection to parser/lang.ts | .rs files detected, outline extraction attempted | S |
| T4 | Refactor metrics logger to support multiple output formats | Interface extracted, JSON format preserved, new format skeleton | M |
| T5 | Investigate and document the session depth algorithm | Accurate written summary of how depth works, thresholds listed | S |

### External codebases (phase 2)

Tasks on codebases the agent has never seen, to control for
familiarity. Selected after pilot results.

## 6. Procedure

### Per-session protocol

1. Start from a clean git state (stash or fresh clone).
2. Configure the condition (governed or ungoverned).
3. Start a new agent session with a fresh context window.
4. Deliver the task prompt verbatim.
5. Let the agent work without human intervention until it declares
   completion or gives up.
6. Record: API transcript, graft decision logs (if governed),
   git diff of changes, agent's final status message.
7. Evaluate task completion against acceptance criteria.

### Data recording

| Artifact | Governed | Ungoverned |
|----------|----------|------------|
| API transcript | Yes | Yes |
| `_receipt` blocks | Yes | N/A |
| NDJSON decision log | Yes | N/A |
| git diff | Yes | Yes |
| Agent final message | Yes | Yes |
| Completion evaluation | Yes | Yes |

## 7. Analysis plan

Chosen before data collection. No post-hoc test shopping.

### Primary analysis

| Metric | Test | Rationale |
|--------|------|-----------|
| M1 (burden) | Wilcoxon signed-rank | Paired, non-normal distribution expected |
| M2 (completion) | McNemar's test | Paired binary outcome |
| M3 (churn) | Wilcoxon signed-rank | Paired, likely skewed |
| M4 (recovery) | Descriptive (%) | Governed-only metric, no paired comparison |
| M5 (evasion) | Descriptive (count) | Low expected counts, descriptive sufficient |

### Effect size

Report Cohen's d (or rank-biserial correlation for non-parametric
tests) for M1 and M3. Confidence intervals on all estimates.

### Significance

α = 0.05, two-tailed. No multiple comparison correction for the
pilot (5 planned comparisons on different constructs). If expanded,
apply Bonferroni.

### Minimum sample

- **Pilot:** 10 task pairs (20 sessions). Enough to estimate
  effect sizes and validate the protocol.
- **Full study:** Sample size determined by pilot effect sizes
  using power analysis (target power = 0.80).

## 8. Threats to validity

| Threat | Type | Mitigation |
|--------|------|------------|
| Task selection bias | Internal | Task bank includes varied profiles; external codebases in phase 2 |
| Agent familiarity with graft | Internal | Ungoverned condition runs on same codebase, controlling for familiarity |
| Tool availability confound | Internal | Governed agents have more tools, not just governance. Report tool usage breakdown. |
| Blinding impossible | Internal | Agent knows graft is available. Mitigate by using identical prompts. |
| Measurer bias | Internal | Pre-registered hypotheses; automated metrics where possible |
| Small N | Statistical | Pilot first; power analysis before full study |
| Order effects | Internal | Randomized condition order per task |
| API cost | Practical | Pilot with 10 pairs; budget-cap per session |
| Codebase familiarity | External | Phase 2 uses external codebases the agent hasn't seen |

## 9. Infrastructure required

Before running the study:

- [ ] Receipt extraction script: parse `_receipt` blocks from API
  transcripts (JSON grep + aggregate)
- [ ] Blacklight ungoverned baseline: parse raw Read tool responses
  for byte counts in ungoverned sessions
- [ ] Evasion detector: pattern matcher for cat/head/tail in Bash
  calls, range-reconstruction detection
- [ ] Session runner: script to set up conditions, deliver prompts,
  and record artifacts reproducibly
- [ ] Task bank: finalize at least 10 tasks with acceptance criteria

## 10. Timeline

1. **Protocol review** — this document, reviewed and locked
2. **Infrastructure** — build extraction and detection scripts
3. **Pilot** — 10 task pairs, analyze results
4. **Expand or stop** — if pilot shows signal, power-analyze for
   full study; if not, investigate why

## 11. Reporting

Results published in `docs/study/results/` with:
- Raw data (anonymized transcripts, metrics per session)
- Analysis scripts (reproducible)
- Effect sizes with confidence intervals
- Honest assessment of what worked and what didn't
- Recommendations for graft's roadmap based on findings
