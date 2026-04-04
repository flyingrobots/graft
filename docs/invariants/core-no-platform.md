# Core has no platform imports

**Legend:** CLEAN_CODE

Directories `src/policy/`, `src/parser/`, and `src/operations/`
do not import `node:fs`, `node:path`, or `node:child_process`
directly. They receive platform capabilities through ports
(e.g., `FileSystem` interface).

`src/hooks/` is exempt — hooks are platform-specific scripts
by design (they run as subprocesses in Claude Code).

## If violated

Core logic becomes untestable without real filesystems. Platform
coupling prevents running graft in non-Node environments (browser,
Deno, Bun) in the future.

## How to verify

- `grep -r "from \"node:" src/policy/ src/parser/ src/operations/`
  returns zero results (excluding type-only imports if any)
- Operations receive a `FileSystem` port via `ToolContext`
