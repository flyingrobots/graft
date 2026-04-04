# Path traversal is blocked

**Legend:** CORE

All path-accepting MCP tools use `ctx.resolvePath()` which rejects
relative paths that escape the project root via `..` segments.
Hook scripts use `safeRelativePath()` for the same purpose.

## If violated

Agents can read arbitrary files on the host filesystem —
`/etc/passwd`, `~/.ssh/id_rsa`, other projects' source code.
This is a security boundary.

## How to verify

- `resolvePath` tests verify rejection of `../` escapes
- `safeRelativePath` tests verify null return for outside-cwd paths
- Every MCP tool handler calls `ctx.resolvePath()` before any
  file operation
