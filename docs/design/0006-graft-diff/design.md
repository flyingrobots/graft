# Cycle 0006 — graft diff

**Type:** Feature
**Legend:** CORE
**Sponsor human:** James
**Sponsor agent:** Claude

## Hill

An agent (or human) can ask "what changed structurally?" between
any two git refs and get symbol-level changes instead of line hunks.
No WARP needed — tree-sitter parses both revisions on the fly.

## Playback questions

### Agent perspective

1. Can I call `graft_diff` as an MCP tool with two refs and get
   a structural diff?
2. Does the diff show added/removed/changed symbols with signatures?
3. Does it work across multiple files (not just one)?
4. Can I diff working tree vs HEAD (the common case)?
5. Can I diff any two arbitrary refs?

### Operator perspective

1. Does `graft diff HEAD~3..HEAD` show meaningful structural changes?
2. Is the output compact enough to be useful, not just a dump?

## Non-goals

- **No WARP dependency.** Parses on the fly via git + tree-sitter.
- **No caching.** Each diff is computed fresh. WARP worldlines
  will make this instant later.
- **No blame/annotate.** Just structural diff between two points.

## Design

### MCP tool: `graft_diff`

```text
graft_diff(base?, head?, path?)
```

- `base`: git ref (default: `HEAD`). Use `""` for the index.
- `head`: git ref (default: working tree). Use a SHA/branch/tag.
- `path`: optional file filter. If omitted, diffs all changed files.

### Flow

1. Determine changed files between base and head:
   - Working tree vs ref: `git diff --name-only <base>`
   - Ref vs ref: `git diff --name-only <base> <head>`
2. For each changed file:
   a. Get the file content at base: `git show <base>:<path>`
   b. Get the file content at head: read from worktree or
      `git show <head>:<path>`
   c. Detect language from extension (`.ts` → `"ts"`, `.js` → `"js"`)
   d. Parse both with `extractOutline`
   e. Diff with `diffOutlines`
3. Return per-file structural diffs.

### New/deleted files

- File exists at head but not base → all symbols are "added"
- File exists at base but not head → all symbols are "removed"
- Parse only the version that exists.

### Response shape

```typescript
interface GraftDiffResult {
  base: string;           // ref or "working tree"
  head: string;           // ref or "working tree"
  files: FileDiff[];
}

interface FileDiff {
  path: string;
  status: "modified" | "added" | "deleted";
  diff: OutlineDiff;      // reuses existing OutlineDiff type
}
```

### Language support

Only diffs files with supported extensions (`.ts`, `.js`).
Other files are listed with `status` but no structural diff
(empty OutlineDiff).

### Git interaction

Use `child_process.execFileSync` for git commands (no shell):
- `git diff --name-only [--diff-filter=...] <base> [<head>]`
- `git show <ref>:<path>`

Keep it simple. No libgit2, no isomorphic-git.

## Architecture

```text
src/
  git/
    diff.ts        git diff --name-only, git show <ref>:<path>
  operations/
    graft-diff.ts  orchestrates git + parser + diffOutlines
```

## Test strategy

- `test/unit/operations/graft-diff.test.ts` — end-to-end: create
  a temp git repo, make commits with known changes, run graft_diff,
  verify structural output. Tests for: modified files, added files,
  deleted files, multi-file diffs, working tree vs HEAD.
- `test/unit/git/diff.test.ts` — git command wrappers: changed
  file list, file content at ref.
