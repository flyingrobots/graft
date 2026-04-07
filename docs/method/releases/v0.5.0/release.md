# Release Design: v0.5.0

## Included cycles

- **Cycle 0024** — precision tools: `code_show` and `code_find`
- **Cycle 0025** — layered worldline model on the MCP surface
- **Cycle 0027** — honest unsupported-file degradation
- **Cycle 0029** — Markdown summary support
- **Cycle 0031** — MCP `.graftignore` and policy-option parity
- **Cycle 0032** — structural-tool policy enforcement
- **Cycle 0033** — explicit `run_capture` policy boundary
- **Cycle 0035** — versioned output schemas
- **Cycle 0036** — grouped CLI parity surface
- **Cycle 0037** — one-step bootstrap flags for Claude/Codex
- **Cycle 0038** — explicit `serve` transport startup, help-first CLI
- **Cycle 0039** — release-readiness hardening

## Hills advanced

- **CORE**: Graft is now substantially easier to adopt and safer to
  trust. The CLI mirrors the core MCP surface, bootstrap is much
  faster, output contracts are versioned, unsupported files degrade
  honestly, and policy parity is much tighter across the agent-facing
  read surface.
- **WARP**: Graft moved beyond raw structural history into
  context-aware precision and runtime semantics. Agents can focus on a
  symbol, search for symbols structurally, and reason about whether an
  answer came from commit history, a ref view, or the live workspace.
- **Release posture**: release preflight is now stricter and more
  honest. There is an explicit security gate, `run_capture` has a clear
  trust boundary, and the current Vite advisory path is eliminated.

## Sponsored users

- **Coding agents**: get symbol-level precision tools, more honest
  unsupported-file behavior, Markdown structure, and machine-readable
  `_schema` metadata on responses.
- **Operators**: get a coherent grouped CLI, explicit `serve`
  semantics, faster bootstrap via `init --write-*`, stronger
  `.graftignore` parity, and a clearer release-time security posture.
- **Contributors**: get the architecture reference, stronger release
  doctrine, and more consistent contracts across CLI and MCP.

## Version justification

**Minor** (0.4.0 → 0.5.0).

This is not a patch-sized release. It adds new tools and new externally
meaningful behavior:

- new precision surface (`code_show`, `code_find`)
- new grouped CLI surface
- new Markdown capability on bounded-read tools
- new versioned `_schema` contract on machine-readable output
- new `init --write-*` bootstrap behavior
- new explicit `serve` transport startup semantics

None of these changes require a major bump because the current
repo/client posture is still pre-1.0 and a compatibility path remains
for no-arg MCP startup. But the surface change is clearly broader than
bugfix-only work, so this should not be a patch.

## Migration

Migration is light, but there are a few things to call out:

- **MCP startup**: clients should use `npx @flyingrobots/graft serve`
  explicitly. Compatibility fallback still exists, but `serve` is now
  the correct durable contract.
- **Bootstrap**: operators can now use `graft init --write-claude-mcp`,
  `--write-claude-hooks`, and `--write-codex-mcp` instead of manual
  config edits.
- **run_capture posture**: shell capture can now be disabled entirely
  with `GRAFT_ENABLE_RUN_CAPTURE=0`, and persisted logs can be disabled
  with `GRAFT_RUN_CAPTURE_PERSIST=0`.

## Release acceptance

This release is ready to tag when all of the following are true:

- `package.json` is bumped to `0.5.0`
- `CHANGELOG.md` has a `0.5.0` section covering the shipped surface
- `docs/releases/v0.5.0.md` is final
- `docs/method/releases/v0.5.0/verification.md` is filled with actual
  preflight/tag/publish evidence
- `pnpm release:check` passes on the final release commit
