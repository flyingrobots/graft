# Next Release Ranked Queue

Status: active

## Release thesis

The next release should tighten the product around day-to-day coding
workflow truth before it expands into larger substrate bets.

That means:

- pay down the precision/search debt in the exact seams we are about to
  build on
- ship the next product-visible search/refactor capability on top of
  those cleaner seams
- only pull hook, context, and observability debt forward when the
  corresponding product surface is actually in the release

This is a release-shaping queue, not a commitment to burn down the full
`bad-code/` lane.

## Completed tranche

Cycle `0045-CODE_mcp-tool-precision` cleared the first pre-release debt
bar:

- `code_find` now uses a runtime-backed request model
- precision query matching and match shaping moved out of the shared
  helper blob
- git file enumeration now runs through typed query/result seams
- `graft_map` now uses runtime-backed request/result objects

This retires the old `bad-code` items for:

- `CLEAN_CODE_mcp-tool-code-find`
- `CLEAN_CODE_mcp-tool-precision`
- `CLEAN_CODE_mcp-tool-git-files`
- `CLEAN_CODE_mcp-tool-map`

Cycle `0046-default-governed-read-path` cleared the conditional hook
debt tranche and shipped the first honest default-read guardrail:

- Claude `PreToolUse` now redirects large JS/TS native reads to
  graft's bounded-read path before the full file lands in context
- `PostToolUse` now acts as a backstop for oversized code reads that
  still slip through
- hook inspection and policy evaluation now share a smaller seam

This retires the old `bad-code` items for:

- `CLEAN_CODE_hook-pretooluse-read`
- `CLEAN_CODE_hook-posttooluse-read`

Cycle `0047-non-claude-default-governed-read-integration` tightened the
next-highest-leverage non-Claude path:

- `graft init --write-codex-mcp` now seeds `AGENTS.md` alongside
  `.codex/config.toml`
- setup docs now distinguish MCP availability from actual governed-read
  posture by client
- the remaining non-Codex instruction parity question is explicit in
  backlog instead of implied

## Ranked queue

1. MCP context and receipt seam tightening, conditional
   Includes [CLEAN_CODE_mcp-context.md](backlog/bad-code/CLEAN_CODE_mcp-context.md) and [CLEAN_CODE_mcp-receipt.md](backlog/bad-code/CLEAN_CODE_mcp-receipt.md).
   Pull this forward if and only if the release includes
   [SURFACE_mcp-runtime-observability.md](backlog/up-next/SURFACE_mcp-runtime-observability.md), because those seams will otherwise become the next weak point in the surface.

2. [SURFACE_mcp-runtime-observability.md](backlog/up-next/SURFACE_mcp-runtime-observability.md)
   Valuable, but it should not get ahead of the search/refactor product
   gap or the debt directly attached to that gap.

## Below the cut line

These items are real but should not be treated as release blockers for
the next packet:

- [CORE_non-read-burden.md](backlog/up-next/CORE_non-read-burden.md)
- [SURFACE_non-codex-instruction-bootstrap-parity.md](backlog/cool-ideas/SURFACE_non-codex-instruction-bootstrap-parity.md)
- [CLEAN_CODE_mcp-server.md](backlog/bad-code/CLEAN_CODE_mcp-server.md)
- [CLEAN_CODE_mcp-repo-state.md](backlog/bad-code/CLEAN_CODE_mcp-repo-state.md)
- [WARP_name-based-symbol-matching.md](backlog/bad-code/WARP_name-based-symbol-matching.md)
- [WARP_persisted-sub-commit-local-history.md](backlog/up-next/WARP_persisted-sub-commit-local-history.md)
- [WARP_reactive-workspace-overlay.md](backlog/up-next/WARP_reactive-workspace-overlay.md)
- [WARP_symbol-identity-and-rename-continuity.md](backlog/up-next/WARP_symbol-identity-and-rename-continuity.md)

Why they stay below the line:

- they are broader substrate or semantics work
- they will absorb schedule quickly
- they do not buy as much immediate operator-facing sharpness as the
  current release frontier

## Notes

- This queue intentionally treats debt as attached to nearby product
  surfaces, not as a parallel cleanup program.
- The exact version number should be decided later in the shaped release
  packet under `docs/method/releases/vX.Y.Z/`.
- If the release narrows to only reference-search work, items 1 and 2
  should both drop out of the packet rather than dragging extra
  debt and scope into the ship.
