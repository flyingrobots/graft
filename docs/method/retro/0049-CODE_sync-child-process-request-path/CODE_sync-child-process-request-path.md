# Sync child_process calls on request paths block testability and scale Retro

Design: `docs/design/0049-CODE_sync-child-process-request-path/CODE_sync-child-process-request-path.md`
Outcome: Hill met: git and shell execution now flow through explicit `ProcessRunner` and `GitClient` ports, MCP request-path modules and the WARP indexer no longer import `child_process` directly, and `src/operations` no longer imports `node:path` directly.
Drift check: yes

## Summary

- added `ProcessRunner` and `GitClient` ports plus node adapters and
  wired them through the MCP context
- moved repo observation, git diff helpers, precision lookup, git file
  enumeration, reference search, run-capture, and WARP indexing onto
  those seams
- removed the remaining `node:path` imports from `src/operations` by
  turning state-path and working-tree-path resolution into injected
  inputs
- kept the existing MCP, WARP, and CLI behavior intact under the new
  runtime boundary

## Playback Witness

- Verification witness:
  `docs/method/retro/0049-CODE_sync-child-process-request-path/witness/verification.md`

## Drift

- `method_close` reported no active cycles for `0049`, so this retro was
  recorded manually.

## New Debt

- None recorded. Remaining non-green seams are already tracked by:
  `docs/method/backlog/bad-code/CLEAN_CODE_cli-index-cmd.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_git-diff.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_mcp-context.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_mcp-repo-state.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_mcp-server.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-code-find-orchestration.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-code-refs.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-code-show.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-map-collector-orchestration.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-precision-helper-composition.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_mcp-tool-run-capture.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_operations-graft-diff.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_operations-state.md`,
  `docs/method/backlog/bad-code/CLEAN_CODE_warp-indexer.md`.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
