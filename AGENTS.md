# AGENTS

This guide is for AI agents and human operators recovering context in the Graft repository.

## Git Rules

- **NEVER** amend commits.
- **NEVER** rebase or force-push.
- **NEVER** push to `main` without explicit permission.
- Always use standard commits and regular pushes.

## Documentation & Planning Map

Do not audit the repository by recursively walking the filesystem. Follow the authoritative manifests:

### 1. The Entrance
- **`README.md`**: Public front door, core value prop, and quick start.
- **`GUIDE.md`**: Orientation, fast path, and system orchestration.
- **`docs/SETUP.md`**: Detailed per-editor MCP and hook configuration.

### 2. The Bedrock
- **`ARCHITECTURE.md`**: Authoritative structural reference (Ports, Adapters, WARP).
- **`docs/VISION.md`**: Core tenets and the provenance-aware mission.
- **`METHOD.md`**: Repo work doctrine (Backlog lanes, Cycle loop).

### 3. The Direction
- **`docs/BEARING.md`**: Current execution gravity and active tensions.
- **`docs/method/backlog/`**: The active source of truth for pending work.
- **`docs/design/`**: Active and landed cycle design documents.

### 4. The Proof
- **`docs/CHANGELOG.md`**: Historical truth of merged behavior.
- **`docs/audit/`**: Structural health and due diligence reports.

## Context Recovery Protocol

When starting a new session or recovering from context loss:

1. **Read `docs/BEARING.md`** to find the current execution gravity.
2. **Read `METHOD.md`** to understand the work doctrine.
3. **Check `docs/method/backlog/asap/`** for imminent work.
4. **Check `git log -n 5` and `git status`** to verify the current branch state.

## End of Turn Checklist

After altering files:

1. **Verify Truth**: Ensure documentation is updated if behavior or structure changed.
2. **Log Debt**: File bad-code items to `docs/method/backlog/bad-code/` (one file per concern).
3. **Log Ideas**: File cool ideas to `docs/method/backlog/cool-ideas/` (one file per idea).
4. **Commit**: Use focused, conventional commit messages. Propose a draft before executing.
5. **Validate**: Run `pnpm lint` and `pnpm test`.
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
