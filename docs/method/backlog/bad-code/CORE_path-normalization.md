# Observation cache path normalization

The observation cache in the MCP server keys on resolved absolute
paths (`path.resolve(projectRoot, ...)`). But if the same file is
accessed via different relative paths (e.g., `src/foo.ts` vs
`./src/foo.ts` vs an absolute path), each gets a separate cache
entry. This wastes memory and defeats re-read suppression.

Fix: normalize all paths to a canonical form on entry to the cache.
`path.resolve` already does most of the work, but symlink resolution
(`fs.realpathSync`) may also be needed.

Affects: `src/mcp/server.ts`, observation cache Map keys
