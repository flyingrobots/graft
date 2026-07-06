# v0.11.0 Release Verification Witness

## Discovery Facts

- Repository type: JS/TS package (pnpm); lockfile `pnpm-lock.yaml`
- Publishable unit: `@flyingrobots/graft` (npm)
- Version-bearing manifest: `package.json` (0.10.1 -> 0.11.0)
- Previous tag: `v0.10.1`
- Target tag: `v0.11.0`
- Release branch: `release/graft-v0.11.0`
- Registry state before publication: `npm view @flyingrobots/graft version`
  returned `0.10.1`
- Downstream driver: jedit currently depends on registry package
  `@flyingrobots/graft@0.10.1`, so a published package is required before
  jedit can consume the merged projection APIs without sibling checkouts.

## Validation

| Step | Command | Result |
| :--- | :--- | :--- |
| Worktree guard | `git status --short` | clean before release edits |
| Lockfile | `pnpm install` | current; no lockfile changes |
| Release gate | `WESLEY_BIN=$HOME/.cargo/bin/wesley pnpm release:check` | pass |
| Diff whitespace | `git diff --check` | pass |
| Registry | `npm view @flyingrobots/graft version` | `0.10.1` before publication |

Notes:

- The passing release gate included 244 test files / 1835 tests, security gate
  results `critical=0 high=0 moderate=1 low=1`, and pack dry-run tarball
  `flyingrobots-graft-0.11.0.tgz`.
- First `pnpm release:check` attempt failed because `WESLEY_BIN` was not set;
  this is the runbook-required hermetic schema-check input, not a product
  failure.
- First `WESLEY_BIN=$HOME/.cargo/bin/wesley pnpm release:check` attempt failed
  because the deterministic Echo package descriptor still carried
  `sourcePackageVersion: "0.10.1"` after the package manifest bump. The
  descriptor was updated to `0.11.0` and the full release gate was re-run from
  the top.

## Dogfood

Run through a fresh MCP stdio session using `StdioClientTransport` against
`node bin/graft.js serve` on PR head `6f7e7fc89f840336a3805f2a8c8710ccd15f2852`.

| Command | Result |
| :--- | :--- |
| `client.listTools()` | 33 tools listed |
| MCP `doctor` | parser healthy; thresholds 150 lines / 12288 bytes |
| MCP `safe_read` for `src/parser/lang.ts` | `projection: "content"`; 119 lines / 3351 bytes |
| MCP `safe_read` for `src/mcp/server.ts` | `projection: "outline"`; 18 outline entries for 417 lines / 14027 bytes |
| MCP `file_outline` for `src/echo/structural-history-client.ts` | 18 outline entries; first entry `EchoContractObstruction` |
| MCP `stats` | stats receipt emitted; reads=1, outlines=2, refusals=0, cacheHits=0 |

The final tag step must rerun this same MCP stdio dogfood after this witness
PR merges and before pushing `v0.11.0`, because GitHub creates a new merge
commit for `main`. The tag is blocked if the final-main dogfood result differs.

Note: an initial CLI-only dogfood attempt was rejected as insufficient because
the release runbook requires exercising the MCP session path. An initial
parallel CLI attempt also produced one expected writer-ref contention refusal
(`writer ref was updated by another process`). The release path treats dogfood
as sequential because the local history writer is intentionally single-writer.

## Merge, Tag, Publish

Pending until the release PR is merged to `main`.

## Non-Blocking Warnings

- No warnings recorded yet.
