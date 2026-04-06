# Graft Agent Notes

Project-specific guidance that is useful to rehydrate quickly. This
file is for local working truth, not doctrine. Repo truth still lives
in code, tests, and the signpost docs.

## Read first

- `README.md` — product claim and operator-facing surface
- `METHOD.md` — local process
- `docs/BEARING.md` — current direction and tensions
- `docs/VISION.md` — bounded repo synthesis
- `CLAUDE.md` — project instructions and scorecard rules

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

## Current hot items

- `docs/method/backlog/asap/CORE_unsupported-file-outline-correctness.md`
- `docs/method/backlog/asap/CORE_markdown-summary-support.md`

## Current learnings

- Unsupported files currently can hit the outline path and return empty
  code outlines because outline extraction defaults to TS when no
  language is supplied. Treat that as a correctness issue, not a UX
  quirk.
- Markdown is a strong candidate for first-class structured document
  support because README/docs reads are common and headings are honest
  structure.
- `code_find -> code_show` is a good agent workflow and worth
  dogfooding heavily.

## Commit convention

- Repository operator preference: if you changed files this turn, stage
  the files you touched and make a new commit at the end of the turn.
- Do not amend old commits to do this.
