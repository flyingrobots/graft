# git graft enhance — structural annotations for git commands

Wrap any git command with structural annotations from graft's
parser (and eventually WARP worldlines).

```
git graft enhance log HEAD~3..HEAD
git graft enhance diff HEAD~1
git graft enhance show abc123
git graft enhance blame src/foo.ts
```

The regular git output is preserved — graft injects structural
annotations alongside it. "function evaluatePolicy: +1 param"
next to the diff hunk. "added class SessionTracker" next to the
commit in the log.

This is the human-facing surface that justifies graft beyond the
agent use case. Humans already know git commands. Graft makes
them smarter.

## Implementation layers

**Without WARP (tree-sitter only):** For each commit in the
range, parse changed files at both revisions via
`git show <ref>:<path>`, run extractOutline + diffOutlines.
Slow for large ranges, but works today.

**With WARP worldlines:** Structural diffs are pre-indexed at
each tick. Lookup is instant. The `enhance` command becomes a
thin formatter over worldline queries.

## Subcommands to support

- `log` — structural summary per commit
- `diff` — structural annotations per file alongside hunks
- `show` — structural summary for a single commit
- `blame` — annotate methods/classes with structural history
- `shortlog` — structural churn summary per author

## Open question

Output format: interleaved with git output (human-readable) or
as a separate structured block (agent-consumable)? Probably both,
controlled by `--format=human|json`.
