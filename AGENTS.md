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
2. **Log Debt**: Add follow-on backlog items to `bad-code/` or `cool-ideas/`.
3. **Commit**: Use focused, conventional commit messages. Propose a draft before executing.
4. **Validate**: Run `pnpm lint` and `pnpm test`.

---
**The goal is inevitably. Every feature is defined by its tests.**
