---
title: "Repo path resolver can miss symlink-parent escapes for future writes"
legend: "BADCODE"
cycle: "BADCODE_repo-path-resolver-symlink-parent-write-escape"
source_backlog: "docs/method/backlog/bad-code/BADCODE_repo-path-resolver-symlink-parent-write-escape.md"
---

# Repo path resolver can miss symlink-parent escapes for future writes

Source backlog item: `docs/method/backlog/bad-code/BADCODE_repo-path-resolver-symlink-parent-write-escape.md`
Legend: BADCODE

## Hill

The repo path resolver protects future governed write/create surfaces by
checking the nearest existing ancestor before allowing a logical in-repo
target. This closes symlink-parent escape paths without changing the
existing read behavior, without broad `node:path` refactoring, and
without implementing governed edit.

## Playback Questions

### Human

- [ ] Can I see that non-existent writes through a symlinked parent are blocked before governed edit?
- [ ] Can I see that normal non-existent in-root paths still resolve without broad path refactor?

### Agent

- [ ] Does createRepoPathResolver reject non-existent children under symlinked directories that escape the repo while preserving existing symlink and absolute outside rejection?
- [ ] Does createRepoPathResolver behave consistently for logical projectRoot and canonical real projectRoot?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: path refusal behavior must be
  explicit and stable enough for operators and agents to understand that
  the target escaped the repo through an existing ancestor.
- Non-visual or alternate-reading expectations: playback evidence should
  be test-name-addressable without relying on terminal screenshots.

## Localization and Directionality

- Locale / wording / formatting assumptions: diagnostics remain English
  operator text; paths are treated as opaque filesystem identifiers.
- Logical direction / layout assumptions: no visual layout assumptions.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: the resolver must
  return the logical target path for allowed paths and throw
  `Path traversal blocked` for escaping paths.
- What must be attributable, evidenced, or governed: the tests must show
  that the write-precondition threat model is handled before governed
  edit is pulled.

## Non-goals

- [ ] No governed edit implementation.
- [ ] No write tools.
- [ ] No broad `node:path` refactor.
- [ ] No WARP/LSP/daemon/provenance work.

## Backlog Context

## Problem

`createRepoPathResolver` is currently sufficient for the existing read
surfaces. Existing reads fail when the target file does not exist, and
the resolver already rejects known absolute-outside paths plus symlink
escapes when the full requested target exists.

Governed edit/write changes the threat model. A future write or create
tool may be asked to operate on a path whose final leaf does not exist
yet. In that case, checking only the full requested target with
`realpath` is not enough. The resolver also needs to validate the nearest
existing ancestor.

Example:

```text
repo/
  escape-dir -> /outside

path = escape-dir/new-file.ts
```

For read-only tools, `escape-dir/new-file.ts` does not produce a file to
read. For write/create tools, that same path could create
`/outside/new-file.ts` unless the resolver proves that the nearest
existing ancestor stays inside the repo.

## Current behavior

The current resolver realpaths the full requested target:

```ts
const realResolved = realPathOrSelf(resolved);
```

That catches:

- absolute paths outside the repo
- existing symlink file escapes
- existing symlink directory escapes where the requested target exists

It does not explicitly model the write/create case where a parent exists
but the leaf does not.

## Related evidence

During read-only audit, macOS-style root aliasing exposed a related
inconsistency. A logical temp path under `/var/...` can canonicalize to
`/private/var/...`. With a logical project root, ordinary non-existent
in-root paths may be falsely rejected; with the canonical real project
root, similar paths may be allowed.

That inconsistency has the same underlying shape: comparisons mix the
real project root with a target whose unresolved suffix may still be
logical. The resolver should consistently validate:

1. logical confinement under the requested project root
2. real confinement of the nearest existing ancestor under the real
   project root

## Required fix direction

Do not broaden this into a general `node:path` migration. The fix should
stay local to repo path confinement semantics.

Expected shape:

1. Resolve the requested path logically against the project root.
2. Reject logical traversal outside the project root.
3. Find the nearest existing ancestor of the logical target.
4. Realpath that nearest existing ancestor.
5. Reject if the real ancestor escapes the real project root.
6. Return the logical target path.

This preserves support for non-existent in-root paths while preventing
future write/create tools from escaping through symlinked parents.

## Acceptance

- `createRepoPathResolver` rejects a non-existent child under a symlinked
  directory that escapes the repo.
- `createRepoPathResolver` allows a non-existent child under a normal
  in-root directory.
- `createRepoPathResolver` behaves consistently when `projectRoot` is
  passed as a logical path and when it is passed as the canonical real
  path.
- Existing absolute path outside repo rejection is preserved.
- Existing symlink file escape rejection is preserved.
- Existing symlink directory escape rejection is preserved.
- No broad `node:path` refactor.
- No governed edit implementation.
- Tests use temp repos only.
- Validation uses Dockerized `pnpm test` only.

## Non-goals

- Do not pull or implement governed edit as part of this card.
- Do not add write tools.
- Do not expand WARP, LSP, daemon, or provenance behavior.
- Do not attempt to eliminate all direct `node:path` imports.
