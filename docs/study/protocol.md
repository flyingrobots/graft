# Graft Effectiveness Study Protocol

**Version:** 4.0
**Status:** Draft
**Date:** 2026-04-04
**Protocol hash:** (computed at freeze)

---

## 1. Research question

Does graft reduce retrieval burden in coding agent sessions without
degrading task completion?

## 2. Endpoints

### Primary endpoint

**Retrieval burden per randomized attempt.**

Measured in bytes returned to the agent across all retrieval-class
and discovery-class tool calls (see §4.1 for tool classification).
Every randomized attempt contributes, regardless of task outcome.
This is an unconditional estimand — no conditioning on success,
no survivor bias.

If an attempt fails, its retrieval burden still counts. A
governance system that reduces reads by causing failures is not
an improvement — the guardrail endpoint (§2.2) catches that.

Retrieval burden is defined broadly: it includes bytes from reads,
outlines, search results, file listings, git output, and any other
tool response that delivers codebase content to the agent. Graft
cannot win by shifting cost from reads into search chatter.

Bytes are the canonical substrate truth. Token counts are recorded
as a secondary measure but are not used for the primary analysis
because tokenization varies by model and toolchain.

### Guardrail endpoint

**Task success non-inferiority.**

Graft must not materially reduce successful task completion. The
non-inferiority margin is Δ = −15 percentage points. If graft's
completion rate is worse than the control by more than 15 points,
the study fails the guardrail regardless of burden reduction.

**Justification for Δ = −15pp:** Agent task completion rates on
real-world coding tasks are typically 60–85% (Blacklight baseline).
A 15pp drop (e.g., 75% → 60%) represents a meaningful degradation
that users would notice and object to. Tighter margins (5pp, 10pp)
require sample sizes impractical for a pilot-first design. The
margin may be tightened for the confirmatory study if pilot data
supports it.

Rationale: a dumb muzzle also reduces reads. The study must show
that graft reduces retrieval burden without becoming useless.

### Secondary endpoint (inferential)

- **M3: Re-read churn** — re-reads per file per session. Paired
  inferential test (Wilcoxon). Labeled secondary; no multiple-
  comparison correction needed (single secondary test).

### Operational metrics (descriptive only)

Not hypothesis-tested. Reported as descriptive summaries to
characterize graft's behavior, not to make inferential claims.

- **M4: Refusal recovery rate** — governed-only. What fraction
  of outline/refusal responses lead to productive agent behavior?
- **M5: Governor evasion** — both conditions. Count of
  circumvention patterns. Baseline rate from ungoverned sessions
  establishes false-positive floor.

## 3. Design

### Type

Matched-pair crossover with counterbalancing.

### Participants

A **participant** is an operator who directs the agent across
multiple task attempts. In practice:

- **Pilot:** a single experienced operator (the graft developer)
  running all attempts. This controls for operator variance but
  limits generalizability.
- **Confirmatory:** multiple operators with varying expertise.
  Minimum 3 participants recommended for the mixed-effects
  sensitivity analysis to be meaningful.

**Eligibility:** familiar with the agent's interface (Claude Code
or equivalent), able to follow the per-attempt protocol (§7.1)
without improvisation. No training on graft's tools is provided
beyond what the agent discovers through tool descriptions — the
governed condition must work through the agent's own tool
selection, not operator coaching.

**What a participant is NOT:** the agent itself. The agent is the
instrument. Participants are the humans (or autonomous scaffolds)
who deliver prompts and observe outcomes. If the study uses fully
autonomous runs (no human in the loop), the "participant" is the
run configuration (scaffold + model + system prompt), and the
protocol must document that no human intervened.

### Why not same-task-twice

Within-subject on the same task is contaminated: once an agent (or
the participant directing it) learns the repo layout, that knowledge
does not wash out. There is no meaningful washout period for
codebase familiarity.

### Matched task pairs

Tasks are organized into matched pairs of comparable difficulty,
repo scope, and read profile. Within each pair:

- One task is randomly assigned to the governed condition
- The other to the ungoverned condition
- Assignment is counterbalanced across participants

This means each participant does both conditions, but never the
same task twice. The pairing controls for task-level variance.

### Randomization procedure

Blocked randomization, stratified by task category (feature,
bugfix, refactor, investigation).

For each participant:
1. Within each task pair, flip a fair coin (or use a PRNG with
   a recorded seed) to assign which task gets governed vs
   ungoverned.
2. Block by category: within each category stratum, balance the
   number of governed-first vs ungoverned-first assignments
   (differs by ±1 at most).
3. Randomize the presentation order of task pairs to control for
   fatigue and learning across the session sequence.

The full randomization schedule is generated before any data
collection, committed to `docs/study/infra/randomization.json`,
and hashed. The PRNG seed is recorded in the schedule file.

### Isolation

Each task attempt starts from:

- A fresh git branch at a pinned commit
- A clean `.graft/` directory (governed) or no graft state
- A fresh agent session with empty context window
- The same system prompt frame (see §3.2)

No state carries between attempts. No repo familiarity shortcuts.

### 3.1 Conditions

**Governed:**
- Graft MCP server active (version pinned in protocol)
- Agent has access to all 10 graft tools
- Claude Code hooks active (PreToolUse + PostToolUse)
- Native Read/Write/Edit/Bash/Grep/Glob also available
- See §A.1 for the enforcement matrix

**Ungoverned:**
- No graft. No MCP server. No hooks.
- Agent uses native Read/Write/Edit/Bash/Grep/Glob
- Same model, same system prompt frame, same permissions
- Same time budget

The ungoverned baseline is the best sane non-graft workflow, not a
scarecrow. Same tools minus graft. Same permissions. Same agent.

### 3.2 Baseline lock

Both conditions use identical:

| Parameter | Value |
|-----------|-------|
| Model | claude-sonnet-4-5-20250514 |
| System prompt frame | `docs/study/infra/prompt-frame.md` (frozen at protocol freeze) |
| Non-graft tool surface | Read, Write, Edit, Bash, Grep, Glob |
| Time budget | S: 15 min, M: 45 min, L: 90 min |
| Acceptance harness | Same test suite / criteria per task card |
| Repo revision | Pinned commit SHA per task card |
| Edit/test permissions | Identical (full read/write/execute) |
| Graft version | v0.2.2 (commit `6be695f`) |
| Claude Code version | Pinned at protocol freeze |

Any deviation from baseline lock requires a protocol amendment with
justification, documented before the affected session runs.

### 3.3 Blinding

Full blinding is not possible — the agent knows whether graft tools
are available.

**Mitigations:**
- Identical prompts (no mention of graft in either condition)
- Condition-blind artifact review for a subset of tasks (§12.2)
- Automated metrics from logs, not human judgment

## 4. Metrics — operational definitions

### 4.1 Tool classification

Every tool call is classified into exactly one category:

| Class | Tools | Bytes counted in M1? |
|-------|-------|---------------------|
| **Retrieval** | Read, safe_read, file_outline, read_range, changed_since, graft_diff, Grep (content mode), Bash (cat/head/tail/less) | Yes |
| **Discovery** | Glob, Grep (files mode), Bash (find/ls/tree), stats, doctor | Yes |
| **Mutation** | Write, Edit | No |
| **Execution** | Bash (non-read commands), run_capture | Tail output only |
| **State** | state_save, state_load | No |

Classification is determined by tool name and, for Bash, by command
pattern matching. Ambiguous Bash calls are classified by a
predefined regex set (frozen before data collection).

### 4.2 M1: Retrieval burden (primary)

**Definition:** Total bytes returned to the agent across all
retrieval-class and discovery-class tool responses in the session.

**Governed source:** `_receipt.cumulative.bytesReturned` from the
final tool call. Cross-validated against NDJSON decision log sum.

**Ungoverned source:** Sum of `content[].text.length` (UTF-8 byte
length) across all retrieval/discovery tool responses in the API
transcript.

**Unit:** Bytes (reported as KB). Both bytes and estimated tokens
recorded; bytes are canonical.

### 4.3 M2: Task completion (guardrail)

**Definition:** Binary (0/1). The agent's output meets all of the
task's pre-defined acceptance criteria.

**Acceptance criteria types:**
- **Automated:** test suite passes, linter clean, file exists with
  required content pattern
- **Structural:** git diff contains required changes, no unintended
  deletions
- **Manual (blinded):** for tasks where automated criteria are
  insufficient, a human evaluator scores the output without knowing
  the condition (see §12.2)

**Where manual judgment is required:** it is explicitly flagged in
the task card. The protocol does not hide human judgment inside
"automated" metrics.

**Unit:** Binary. Aggregated as completion rate per condition.

### 4.4 M3: Re-read churn (secondary)

**Definition:** Number of retrieval-class tool calls targeting the
same file path within a session, minus 1. First read is not churn.

**Exclusion:** `CHANGED_SINCE_LAST_READ` responses are not counted
as churn (the file actually changed).

**Source:** Decision log (governed) or API transcript (ungoverned),
grouped by normalized file path.

**Unit:** Re-reads per file per session (report median and max).

### 4.5 M4: Refusal recovery rate (operational, governed-only)

**Definition:** When graft returns `projection: "outline"` or
`projection: "refused"`, is the agent's next relevant action
productive?

**Productive actions:** read_range on a jump table entry, proceed
with outline info, ask about a specific symbol.

**Unproductive actions:** re-read same file with native Read, Bash
cat, ask user to paste.

**Source:** Sequence analysis of consecutive tool calls. Cases
where the agent's next action is unrelated to the refused file
are excluded (not counted as productive or unproductive).

**Ambiguous cases:** annotated by two independent raters. Inter-
rater agreement reported. Disagreements resolved by discussion.

**Unit:** Percentage productive. No paired comparison (governed-
only metric).

**Human judgment disclosure:** M4 is NOT fully computable from
logs alone. Ambiguous cases require human annotation. This is
acceptable for a descriptive operational metric but means M4
cannot be reproduced without access to the raters or a frozen
annotation codebook. The codebook is frozen with the protocol.

### 4.6 M5: Governor evasion (secondary)

**Definition:** Tool calls that appear to circumvent graft's
governance, detected by pattern matching.

**Evasion patterns (predefined, frozen):**
- Bash with `cat|head|tail|less|more|sed -n` targeting a governed
  file path
- Sequential `read_range` calls reconstructing >80% of a file
- Agent requesting user paste file contents (detected in agent
  text output)
- Grep with context >50 lines on a governed file

**Source:** Automated pattern matcher on API transcript. False
positive rate estimated from ungoverned sessions (where evasion
is meaningless — all reads are "direct").

**Unit:** Evasion events per session.

## 5. Unit of analysis

**Collection level:** task attempt (one session, one task, one
condition).

**Primary inferential unit:** participant-level paired summary.
Each participant contributes one governed mean and one ungoverned
mean (averaged across their task attempts in each condition).

**Sensitivity analysis:** mixed-effects model with participant
and task pair as random effects, condition as fixed effect.

## 6. Task bank

### 6.1 Task sources

Tasks are drawn from:
- **Frozen historical backlog:** closed graft cycles with known
  outcomes, rewritten as task prompts
- **Curated external tasks:** tasks on open-source repos the agent
  has not seen during development
- **Negative controls:** tasks where graft should provide minimal
  benefit (e.g., single small file edits, config changes)

Source mixing rules: at least 30% external, at least 10% negative
control. No ad-hoc additions after protocol freeze.

### 6.2 Task card schema

Each task is a frozen artifact with:

```yaml
id: T01
pair: P01          # matched pair ID
title: "..."
repo: flyingrobots/graft
commit: abc123     # pinned
prompt: |
  Exact text delivered to the agent.
acceptance:
  automated:
    - "pnpm test exits 0"
    - "grep -q 'GRAFTIGNORE_MATCH' src/policy/types.ts"
  manual: null     # or description of what human evaluates
difficulty: M      # S/M/L
duration_band: "15-45 min"
read_profile: "5-10 files, 2 large"
category: "feature"   # feature|bugfix|refactor|investigation
negative_control: false
```

### 6.3 Inclusion / exclusion criteria

**Include:** tasks that require reading multiple source files and
have verifiable acceptance criteria (automated or blinded manual).
Tasks may produce code changes, documentation, or written analysis
as output — what matters is that the task requires substantive
code reading, not that the deliverable is code.

**Exclude:** tasks that require no code reading (e.g., editing a
single config value from memory), require external API access,
depend on secrets/credentials, or require interactive human input
during execution.

### 6.4 Starter bank (graft codebase, matched pairs)

| Pair | Task A (ID) | Task B (ID) | Category |
|------|-------------|-------------|----------|
| P01 | Add GRAFTIGNORE_MATCH reason code (T01) | Add STALE_CACHE reason code (T02) | feature |
| P02 | Fix run_capture tail=0 edge case (T03) | Fix read_range start=end edge case (T04) | bugfix |
| P03 | Add Rust lang detection (T05) | Add Python lang detection (T06) | feature |
| P04 | Document session depth algorithm (T07) | Document receipt stabilization loop (T08) | investigation |
| P05 | Extract metrics logger interface (T09) | Extract cache interface (T10) | refactor |

### 6.5 Holdout tasks

Tasks P04 and P05 are held out from pilot tuning. They are not
used during protocol refinement or infrastructure validation. They
enter only at the confirmatory stage.

### 6.6 Negative controls

Task pair P04 (investigation) serves as a partial negative control:
investigation tasks involve reading docs and code but minimal large-
file retrieval. Graft's governance should provide less benefit.

Additional negative control pairs added for the external task bank
(small single-file edits, config changes).

## 7. Procedure

### 7.1 Per-attempt protocol

1. Check out the pinned commit on a fresh branch.
2. Reset `.graft/` (governed) or confirm no graft state.
3. Configure condition per randomization schedule.
4. Start a fresh agent session (empty context).
5. Deliver the task prompt verbatim. No additional guidance.
6. Agent works without human intervention until it declares
   completion, gives up, or hits the time budget.
7. Record all artifacts (§7.2).
8. Run acceptance harness.
9. Reset repo state for next attempt.

### 7.2 Artifacts recorded

| Artifact | Governed | Ungoverned |
|----------|----------|------------|
| Full API transcript (JSON) | Yes | Yes |
| `_receipt` blocks extracted | Yes | N/A |
| NDJSON decision log | Yes | N/A |
| git diff of changes | Yes | Yes |
| Agent final message | Yes | Yes |
| Acceptance harness output | Yes | Yes |
| Wall-clock duration | Yes | Yes |
| Tool call count by class | Yes | Yes |

All artifacts are timestamped and keyed by
`{participant}_{task_id}_{condition}`.

## 8. Analysis plan

Pre-specified. No post-hoc test shopping.

### 8.1 Primary analysis (M1: retrieval burden)

**Test:** Wilcoxon signed-rank test on participant-level paired
differences (governed minus ungoverned mean burden per randomized
attempt, unconditional on task outcome).

**Effect size:** Rank-biserial correlation with 95% confidence
interval.

**Minimum practically important effect size:** 30% reduction in
median retrieval burden. Statistical significance without practical
significance is not a win.

**Sensitivity:** Mixed-effects model with participant and task pair
as random effects (confirms primary result is not driven by one
participant or one task pair).

### 8.2 Guardrail analysis (M2: task success)

**Test:** Non-inferiority analysis on the participant-level paired
completion rate difference.

For each participant, compute:
- governed completion rate = (successes in governed) / (attempts in governed)
- ungoverned completion rate = (successes in ungoverned) / (attempts in ungoverned)
- paired difference = governed rate − ungoverned rate

**Primary:** Compute the 90% confidence interval (one-sided α=0.05)
for the mean paired difference using a bootstrap percentile method
(10,000 resamples). Non-inferiority is established if the lower
bound of the CI exceeds −0.15.

**Sensitivity:** Mixed-effects logistic regression with condition
as fixed effect, participant and task pair as random effects. Report
the odds ratio and its CI. Non-inferiority margin on the odds ratio
scale: OR > 0.5 (governed odds of success at least half of
ungoverned).

**Interpretation:**
- Lower bound of paired difference CI > −0.15 → non-inferiority
  established, primary endpoint result stands
- Lower bound ≤ −0.15 → guardrail fails, burden reduction is moot
  regardless of M1 result

**Why not McNemar:** McNemar's test assumes a single 2×2 table of
discordant pairs. This design has multiple attempts per participant
across matched task pairs — the unit structure does not reduce to a
clean discordance table. The paired rate-difference approach respects
the multi-level design.

### 8.3 Secondary analysis (M3: churn)

**Test:** Wilcoxon signed-rank on participant-level paired
differences in re-read churn rate.

Single secondary inferential test — no multiple-comparison
correction needed. Labeled secondary; does not gate the primary
conclusion.

### 8.4 Operational metrics (M4, M5)

M4 (refusal recovery) and M5 (evasion) are descriptive. They
characterize graft's behavior but are not hypothesis-tested. No
p-values, no corrections, no inferential claims. Reported as
percentages and counts with confidence intervals.

### 8.5 Exploratory analyses (not corrected)

- Retrieval efficiency frontier: successful completions per KB
  of retrieval burden (visualization, not inferential)
- Moderator analysis: does graft help more on tasks with high
  read profiles? On unfamiliar codebases?
- Tool usage breakdown: which graft tools are actually used, and
  how does tool mix differ between conditions?
- Stratification by task category, difficulty, repo
- Burden conditioned on success (exploratory complement to the
  unconditional primary)

### 8.6 Intention-to-treat vs per-protocol

**Primary:** intention-to-treat. All randomized attempts are
analyzed in their assigned condition. M1 is unconditional — every
attempt's retrieval burden counts, regardless of task outcome.
This eliminates survivor bias and is consistent with the estimand
defined in §2.

**Sensitivity:** per-protocol analysis excluding attempts with
protocol deviations (§9). Also: burden conditioned on success
as an exploratory complement (§8.5).

## 9. Pre-registered exclusions and deviations

### 9.1 Pre-specified exclusion criteria

An attempt is excluded if:

- API transcript is missing or corrupted (>10% of tool calls have
  no recorded response)
- Provider outage interrupted the session (documented by error
  logs, not by outcome)
- Acceptance harness itself has a bug discovered post-hoc
  (documented, applied symmetrically to both conditions)
- Repo setup failed (wrong commit, missing dependencies)

Excluded attempts are listed in the results with reasons. Exclusion
rate >20% triggers a protocol review before continuing.

### 9.2 Protocol deviations

A deviation is any departure from §7.1. Recorded but not excluded
unless they directly affect the primary endpoint.

Examples: human intervened during agent work, time budget exceeded
by >50%, agent used a tool not in the permitted surface.

### 9.3 Stopping rules

- **Futility:** if after 10 pairs, the observed effect on M1 is
  in the wrong direction (governed burden higher) with p > 0.80
  on a one-sided test, stop and investigate.
- **Harm:** if governed completion rate is >25pp worse than
  ungoverned after 10 pairs, stop and investigate.
- **Success:** no early stopping for efficacy. Run the planned
  sample.

### 9.4 Pilot data disposition

Pilot data is NOT pooled with confirmatory data unless this rule
is explicitly amended before the confirmatory study begins. Pilot
exists to validate the protocol, not to inflate N.

## 10. Pilot plan

### 10.1 Scope

5 matched task pairs (10 sessions). Uses starter bank P01–P03
plus one external pair. Holdout pairs (P04–P05) are not used.

### 10.2 Promotion criteria

The pilot promotes to confirmatory if ALL of the following:

- [ ] ≥95% log completeness (all artifacts in §7.2 present)
- [ ] Metric computation succeeds without manual data cleanup
- [ ] Acceptance criteria produce neither floor nor ceiling effects
  (not all-pass or all-fail in either condition)
- [ ] Protocol adherence ≥90% (≤1 deviation per 10 attempts)
- [ ] No unresolved ambiguity in task cards
- [ ] Both conditions operationally runnable without ad-hoc fixes
- [ ] Evasion detector false-positive rate <10% on ungoverned
  sessions
- [ ] Tool classifier assigns >95% of tool calls unambiguously

### 10.3 Pilot analysis

Descriptive only. Point estimates and confidence intervals for all
metrics.

**Power analysis:** do NOT rely solely on the pilot effect size
estimate — small-N effect estimates are notoriously unstable.
Instead, compute a sensitivity grid: required N for the primary
test at power = 0.80 across a range of plausible effect sizes
(e.g., 20%, 30%, 40%, 50% burden reduction). The pilot estimate
informs which row of the grid is most plausible, but the grid
itself is pre-computed.

### 10.4 Shadow dry run

Before the pilot, run 2 task attempts (1 governed, 1 ungoverned)
on a throwaway task to verify:

- Logs are collected and parseable
- Acceptance harness runs
- Condition assignment works
- No missing fields in recorded artifacts
- Timing and cost are within expected bands

Shadow data is discarded. Its only purpose is to prove the
plumbing works.

## 11. Infrastructure required

Before the shadow dry run:

- [ ] Receipt extraction script: parse `_receipt` blocks from API
  transcripts
- [ ] Transcript parser: extract tool calls, classify by §4.1,
  compute byte totals
- [ ] Evasion detector: pattern matcher per §4.6
- [ ] Acceptance harness runner: execute task-specific criteria,
  output pass/fail JSON
- [ ] Session runner: automate condition setup, prompt delivery,
  artifact collection
- [ ] Randomization schedule: pre-generated, sealed
- [ ] Task cards: frozen YAML per §6.2 schema

All infrastructure is versioned in `docs/study/infra/` and hashed
at protocol freeze.

## 12. Reporting

### 12.1 Results structure

Published in `docs/study/results/` with:

- Raw data (anonymized transcripts, per-attempt metrics)
- Analysis scripts (reproducible, versioned with protocol)
- Primary endpoint: effect size with confidence interval
- Guardrail: non-inferiority result
- Secondary endpoint (M3) with p-value
- Operational metrics (M4, M5) as descriptive summaries
- Exploratory visualizations
- Honest assessment of what worked and what didn't

### 12.2 Condition-blind artifact review

For a random 30% subset of completed tasks, an independent
reviewer scores:

- Final git diff
- Acceptance harness output
- Agent's rationale / final message

No condition labels. No session transcript. No tool call logs.
Just the artifact. This provides a second line of defense against
"the tool changed style, not quality."

### 12.3 Retrieval efficiency frontier

Supporting visualization: successful completions per KB of
retrieval burden, plotted for both conditions. Not inferential —
but persuasive if the governed condition sits up and to the left.

## 13. What a hostile reviewer would say

| Attack | Response |
|--------|----------|
| "You cherry-picked tasks where graft helps" | Task bank has sampling rules, negative controls, external codebases, and holdout tasks. Source and inclusion criteria predefined. |
| "The agent learned the repo in run 1 and benefited in run 2" | Matched-pair design — no task is attempted twice. Counterbalanced condition assignment. Fresh branches. |
| "You just muzzled reads and called it a win" | Guardrail endpoint: task success non-inferiority. Plus evasion detection. Plus retrieval burden includes all tool classes, not just reads. |
| "Your baseline was deliberately weak" | Baseline lock: same model, prompt, tools, permissions, time budget. Best sane non-graft workflow. |
| "Five metrics, so you picked the one that looked good" | One pre-registered primary endpoint. One secondary inferential test (M3). M4/M5 are descriptive only. Exploratory labeled as such. |
| "You threw out inconvenient data" | Pre-registered exclusion criteria. ITT primary analysis. Per-protocol sensitivity. All exclusions listed with reasons. |
| "Your manual grading is biased" | Condition-blind artifact review. Inter-rater agreement reported for M4. Automated criteria preferred. |
| "Small sample proves nothing" | Pilot for effect size estimation. Power analysis before confirmatory. Minimum practical effect size predefined. |
| "Your metrics are not reproducible" | All derived metrics computed from raw logs via versioned scripts. Protocol and scripts hashed at freeze. |

## 14. Timeline

1. **Protocol review and freeze** — this document
2. **Infrastructure build** — scripts, harness, task cards
3. **Shadow dry run** — 2 throwaway attempts, verify plumbing
4. **Pilot** — 5 matched pairs, evaluate promotion criteria
5. **Power analysis** — determine confirmatory N
6. **Confirmatory study** — run, analyze, report

## 15. Freeze gate

This protocol is NOT frozen until all four boxes are checked:

- [x] §8.1 primary test wording matches unconditional estimand
- [x] §8.2 guardrail test matches multi-level design
- [x] §3.2 baseline lock has pinned concrete values
- [ ] Handoff artifacts generated (task cards, prompt frame,
  randomization schedule, acceptance harnesses, analysis stub)

Once checked, compute the protocol hash, fill in the header, and
commit. No further changes without a numbered amendment (§16).

## 16. Amendments

Any change to this protocol after freeze requires:

- A numbered amendment document
- Justification
- Whether it affects pilot, confirmatory, or both
- Whether it changes the primary analysis

Amendments are committed to `docs/study/amendments/` and referenced
in the results.

---

## Appendix A: Tool enforcement matrix

### A.1 Governed condition: what happens to each tool

| Agent action | Governed behavior | Logged | Byte-count rule | Evasion? |
|-------------|-------------------|--------|-----------------|----------|
| `Read(path)` on banned file | PreToolUse hook exits 2, blocks Read. Agent sees refusal reason + next steps. | Decision log: projection=refused, reason=BINARY/LOCKFILE/etc. | 0 bytes (blocked) | N/A |
| `Read(path)` on large JS/TS file | Read proceeds (exit 0). PostToolUse hook fires after, tells agent the context cost and suggests safe_read. | Decision log: hook feedback in stderr. | Full file bytes counted (native Read returned it). | No |
| `Read(path)` on small file | Read proceeds (exit 0). PostToolUse silent (small file, no feedback). | No hook log entry. | Full file bytes counted. | No |
| `safe_read(path)` on large file | Returns outline + jump table. | Decision log: projection=outline. Receipt: bytesReturned, bytesAvoided. | Outline bytes counted. | No |
| `safe_read(path)` re-read, unchanged | Returns cached outline or diff. | Decision log: reason=REREAD_UNCHANGED or CHANGED_SINCE_LAST_READ. | Cache/diff bytes counted. | No |
| `file_outline(path)` | Returns structural skeleton. | Receipt logged. | Outline bytes counted. | No |
| `read_range(path, start, end)` | Max 250 lines. | Receipt logged. | Range bytes counted. | No |
| `Bash("cat large_file.ts")` | Not intercepted by hooks (hooks only apply to Read tool). | Not in graft decision log. Captured in API transcript. | Full file bytes counted in M1 via transcript parser. | Yes (M5 pattern) |
| `Grep(pattern, context=999)` | Not intercepted. | Captured in API transcript. | Response bytes counted. | Yes if context >50 lines on governed file (M5 pattern) |

**Key principle:** graft hooks intercept the Read tool only.
PreToolUse blocks bans. PostToolUse educates on large files. All
other tools (Bash, Grep, Glob, Write, Edit) pass through
unmodified. The agent can always route around governance — M5
measures whether it does.

### A.2 Ungoverned condition

All tools behave natively. No hooks. No MCP server. No interception.
Byte counts come entirely from API transcript parsing.

## Appendix B: What exactly is being estimated?

### B.1 Primary estimand (M1)

| Component | Definition |
|-----------|-----------|
| **Population** | Coding agent task attempts on real codebases |
| **Variable** | Total retrieval + discovery bytes returned to the agent |
| **Condition contrast** | Governed (graft active) vs ungoverned (no graft) |
| **Handling of failures** | Included unconditionally. Failed attempts contribute their full retrieval burden. No conditioning on success. |
| **Handling of missingness** | Attempts with corrupted/missing logs are excluded per §9.1. Exclusion rate >20% triggers protocol review. |
| **Summary measure** | Participant-level paired mean difference (governed − ungoverned) |

### B.2 Guardrail estimand (M2)

| Component | Definition |
|-----------|-----------|
| **Population** | Same as M1 |
| **Variable** | Binary task completion (meets all acceptance criteria) |
| **Condition contrast** | Governed completion rate − ungoverned completion rate |
| **Non-inferiority margin** | Δ = −15pp (governed may be up to 15pp worse) |
| **Handling of failures** | Failures count as non-completion in both conditions |
| **Handling of missingness** | Same as M1 |

### B.3 Why unconditional?

Conditioning M1 on success creates survivor bias: if graft causes
some tasks to fail (by refusing useful files, confusing the agent
with outlines), those high-burden failed attempts vanish from the
governed group, making governed burden look artificially low. The
unconditional estimand avoids this. The guardrail ensures graft
does not "win" on burden by failing more tasks.

## Appendix C: Task pair calibration notes

Each matched pair should be accompanied by a brief justification
of why tasks A and B are considered comparable. Template:

```
Pair P01: T01 (GRAFTIGNORE_MATCH) ↔ T02 (STALE_CACHE)
  Comparable because: both add a new reason code to the policy
  enum, require reading policy/types.ts, evaluate.ts, and test
  files. Similar file count (~5), similar file sizes, same repo.
  Neither requires understanding WARP or hooks.
```

Calibration notes are frozen with the task cards. If a pair is
found to be poorly matched during the pilot, it is flagged in the
pilot report and may be replaced via amendment (§15).

## Appendix D: Lab handoff checklist

Can another operator run this study without Slack DMing the author?

- [ ] Protocol document (this file) — frozen, hashed
- [ ] Task cards (YAML, per §6.2) — frozen, hashed
- [ ] Randomization schedule — pre-generated, sealed
- [ ] Acceptance harness — runnable, documented
- [ ] Transcript parser + metric scripts — versioned, tested
- [ ] Evasion detector — pattern set frozen, false-positive rate
  estimated from ungoverned pilot sessions
- [ ] Session runner — automated condition setup, artifact collection
- [ ] Graft version pinned (exact commit or npm version)
- [ ] Model version pinned
- [ ] System prompt frame — identical for both conditions, committed
- [ ] Example output — one complete governed attempt and one
  ungoverned attempt with all artifacts, as a reference
- [ ] Analysis notebook stub — loads data, runs primary + guardrail
  + secondary, produces tables and plots
