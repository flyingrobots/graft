# AGENTS

This guide is for AI agents and human operators recovering context in the Graft repository.

## Git Rules

- **NEVER** amend commits.
- **NEVER** rebase or force-push.
- **NEVER** push to `main` without explicit permission.
- **NEVER** create draft pull requests.
- **NEVER** open a pull request before the local retro for the cycle has been
  completed, committed, and validated. PR creation is a Ship step, not a Retro
  substitute.
- **NEVER** use a `codex` prefix in branch names, PR titles, or commit messages.
- Always use standard commits and regular pushes.
- When opening pull requests, include `Closed #XYZ` references for every GitHub
  issue the PR closes.

## Test Rules

Only write tests that assert actual Graft software invariants, behavior, and
acceptance criteria. Do not write tests that merely assert design document
formatting, markdown structure, incidental wording, or brittle strings in
`stdout`/`stderr`. When command output is the product surface, assert stable
semantics, structured data, or user-visible behavior rather than fragile
phrasing. Write good tests.

## Pull Request Review Gate

Before calling a PR merge-ready, follow the merge gate in
`CODE_STANDARDS.md`. The review requirement is third-party review, not a fixed
number of GitHub approvals.

- Treat CodeRabbitAI and Codex reactions or acknowledgement comments as pending,
  not complete review.
- Wait for a substantive follow-up: clean final result such as `LGTM`, no
  actionable comments, or review issues that must be fixed or explicitly
  accepted.
- If CodeRabbitAI is in cooldown, rate-limited, or out of credits, post
  `@codex review please`.
- If a CodeRabbitAI cooldown comment says to check back after a wait window,
  compare that window to the comment's last-updated timestamp. Wait out the
  remaining time if still inside the window; if the window has expired and no
  review is pending or complete, post `@coderabbitai review please`.
- The requirement is met when every successfully requested reviewer for the
  current PR head has finished and no actionable review issue remains open.
- Green CI on the current PR head is always required unless the operator
  explicitly overrides the gate.

## Documentation & Planning Map

Do not audit the repository by recursively walking the filesystem. Follow the authoritative manifests:

Design packets come first. Before implementation, repair, or RED/GREEN work on
a backlog item, pull the work into `docs/design/` and make the hill, acceptance
criteria, playback questions, and non-goals explicit. Implementation starts
from that packet, not from an unrecorded chat plan.

### 1. The Entrance
- **`README.md`**: Public front door, core value prop, and quick start.
- **`GUIDE.md`**: Orientation, fast path, and system orchestration.
- **`docs/SETUP.md`**: Detailed per-editor MCP and hook configuration.

### 2. The Bedrock
- **`ARCHITECTURE.md`**: Authoritative structural reference (Ports, Adapters, WARP).
- **`docs/VISION.md`**: Core tenets and the provenance-aware mission.
- **`METHOD.md`**: Repo work doctrine (Backlog lanes, Cycle loop).
- **`CODE_STANDARDS.md`**: Code Lawyer audit standards, Red-Green repair loop, and merge-gate doctrine.

### 3. The Direction
- **`docs/BEARING.md`**: Current execution gravity and active tensions.
- **`docs/method/backlog/`**: The active source of truth for pending work.
- **`docs/design/`**: Active and landed cycle design documents.

### 4. The Proof
- **`CHANGELOG.md`**: Historical truth of merged behavior.
- **`docs/audit/`**: Structural health and due diligence reports.

## Context Recovery Protocol

When starting a new session or recovering from context loss:

1. **Read `docs/BEARING.md`** to find the current execution gravity.
2. **Read `METHOD.md`** to understand the work doctrine.
3. **Read `CODE_STANDARDS.md`** before review, release, or PR repair work.
4. **Check `docs/method/backlog/asap/`** for imminent work.
5. **Check `git log -n 5` and `git status`** to verify the current branch state.

## End of Turn Checklist

After altering files:

1. **Verify Truth**: Ensure documentation is updated if behavior or structure changed.
2. **Log Debt**: File bad-code items to `docs/method/backlog/bad-code/` (one file per concern).
3. **Log Ideas**: File cool ideas to `docs/method/backlog/cool-ideas/` (one file per idea).
4. **Commit**: Use focused, conventional commit messages. Propose a draft before executing.
5. **Validate**: Run checks appropriate to the changed surface. For
   docs/process-only edits, `git diff --check` and `pnpm lint` are enough unless
   the document is an executable/product contract. Do not run the full runtime
   suite just because prose changed.
6. **Push**: Push to origin after every commit.

## End of Turn Etiquette

At the end of every turn where you interacted with the user, present:

1. **Cycle stepper**: Use the Bijou MCP `bijou_stepper` to show current
   cycle progress (PULL → RED → GREEN → Playback → Drift → Retro).
2. **Summary**: What you did this turn — cycles completed, files changed,
   tests passing.
3. **Backlog items filed**: List any `bad-code/` or `cool-ideas/` cards
   you committed this turn. Don't just call them out verbally — they
   must be files in the backlog, committed and pushed.
4. **Questions for the user**: Surface any open questions, ambiguities,
   design decisions, or things you noticed that need the user's input.
   Important questions get buried in long turns — this section prevents
   that. Keep it short and actionable.

---
**The goal is inevitability. Every feature is defined by its tests.**
