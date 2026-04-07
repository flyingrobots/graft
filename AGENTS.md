# Graft Agent Notes

Project-specific guidance that is useful to rehydrate quickly. This
file is for local working truth, not doctrine. Repo truth still lives
in code, tests, and the signpost docs.

## Read first

- `README.md` — product claim and operator-facing surface
- `METHOD.md` — local process
- `docs/BEARING.md` — current direction and tensions
- `docs/VISION.md` — bounded repo synthesis

## Project shape

- npm package: `@flyingrobots/graft`
- Primary surface: MCP server + hooks
- Secondary surface: CLI for debugging and local testing
- Parser posture: web-tree-sitter WASM, JS/TS first
- Output posture: structured JSON, not pretty terminal formatting

## Working posture

- Graft is agent-first. Prefer the MCP tools when inspecting the repo.
- Dogfood the actual tool surface when possible: `doctor`,
  `safe_read`, `code_find`, `code_show`, `stats`.
- Do not assume the precision tools are WARP-backed yet. Current
  `code_find` / `code_show` behavior is still live-parse.

## Codex + MCP gotcha

- In Codex interactive sessions, external MCP tool calls may require
  approval the first time they run.
- If graft is trusted, choosing "Always allow" avoids a prompt on every
  call.
- In non-interactive Codex runs, this can surface as
  `user cancelled MCP tool call`. That message can be a Codex approval
  issue rather than a graft server failure.

## Backlog posture

- The repository operator is explicitly fine with proactive backlog
  capture.
- Add backlog items freely when you notice real work, especially under:
  - `docs/method/backlog/bad-code/`
  - `docs/method/backlog/cool-ideas/`
- Use `docs/method/backlog/asap/` for hot follow-ups that should be
  pulled soon.
- Use legend prefixes when they clarify the domain (`CORE`, `WARP`,
  `CLEAN_CODE`).

## Repo rules

### Systems-Style JavaScript scorecard

If a turn modifies JavaScript or TypeScript source files, include a
Systems-Style JavaScript scorecard for each modified file and convert
real findings into backlog items when warranted.

Dimensions:
- Runtime truth (P1)
- Boundary validation (P2)
- Behavior on type (P3)
- SOLID
- DRY

Scores:
- 🟢 good
- 🟡 needs work
- 🔴 violation

### Coding standard

- `STYLE.md` is the local coding standard for Systems-Style
  JavaScript.
- New code should follow it. Existing code migrates incrementally under
  the `CLEAN_CODE` legend.

## Development

```bash
pnpm install
pnpm test
pnpm lint
```

Git hooks:

```bash
git config --local core.hooksPath scripts/hooks
```

## Session start

1. Rehydrate context.
2. Check `docs/method/backlog/asap/`.
3. Check `docs/method/backlog/bad-code/` for touched areas.
4. Check `docs/method/backlog/cool-ideas/` for nearby opportunities.

## Current hot items

- `docs/method/backlog/asap/` is currently empty.

## Current learnings

- Unsupported files now degrade lawfully on the bounded-read path:
  `safe_read` returns `UNSUPPORTED_LANGUAGE` with no fabricated symbols,
  `file_outline` returns an explicit unsupported result, and unsupported
  files are not cached as if they had real outlines.
- Markdown now has first-class heading-based summary support on bounded
  read surfaces, including section jump tables for targeted doc reads.
- `code_find -> code_show` is a good agent workflow and worth
  dogfooding heavily.
- MCP tests should construct servers with explicit `projectRoot` and
  `graftDir` inputs instead of inheriting the repo cwd and live
  `.graft` state.
- MCP stdio integration tests need explicit `env` wiring for sandbox
  values because the MCP SDK only inherits a safe environment allowlist
  by default.
- MCP bounded reads, precision tools, and structural tools now all run
  through the shared MCP policy seam with `.graftignore`, session, and
  budget context.
- Structural aggregation surfaces (`graft_map`, `graft_diff`,
  `graft_since`) now exclude denied files from visible results and
  surface them explicitly in `refused`.
- `run_capture` is an explicit shell-output escape hatch, not a
  bounded-read surface. Treat its output and persisted capture log as
  diagnostic artifacts outside the policy-governed read contract.
- Policy parity is now witnessed as equivalent outcome per surface
  contract, not identical response shape. Hooks align on hard denials
  and differ intentionally on soft pressure.
- Machine-readable outputs now carry versioned `_schema` metadata, and
  the declared contract registry lives in `src/contracts/output-schemas.ts`.
- The shared CLI / MCP capability registry lives in
  `src/contracts/capabilities.ts`.
- The grouped CLI namespaces (`read`, `struct`, `symbol`, `diag`) now
  cover the core operator-facing product surface; `init` and `index`
  remain intentional CLI-only exceptions.

## Commit convention

- Repository operator preference: if you changed files this turn, stage
  the files you touched and make a new commit at the end of the turn.
- Do not amend old commits to do this.
