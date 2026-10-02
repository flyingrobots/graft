# Retro: sludge scan survives untyped parameters

## What shipped

`doctor --sludge` over the whole graft repository returns a report again.

- `src/operations/sludge-detector.ts` reads node fields through one helper,
  `fieldChild`, that turns web-tree-sitter's `undefined` into `null`. The three
  detector sites that compared a field lookup to `null` use it.
- `test/unit/operations/sludge-detector.test.ts` gains four parser-backed
  cases: an untyped JavaScript source, an untyped TypeScript first parameter,
  a declarator with no initializer, and a `detectSludge` scan that includes
  the JavaScript file.

## Playback

### Agent

- [x] Analyzing a JavaScript file whose functions take untyped parameters
      returns a report. The case failed on `main` with the observed TypeError
      and passes on this branch.
- [x] An untyped TypeScript first parameter raises no
      `free_function_data_behavior` signal.
- [x] A top-level `let x;` analyzes without throwing.
- [x] `detectSludge` over a set containing the JavaScript file finishes and
      counts it as scanned. This also failed on `main`.

### Human

- [x] `doctor --sludge` on the graft repository returns a report. From this
      branch's built CLI (`node bin/graft.js doctor --sludge --json`), run in a
      worktree of this branch:

      ```text
      490 sludge signals across 174 of 705 scanned files.
      ```

      `docs/study/infra/generate-randomization.js`, the file that isolated the
      crash, is scanned and raises no signals.

## What the cycle got wrong first

The first diagnosis said web-tree-sitter returns `undefined` for any absent
field, which predicted that all three detector sites crash. RED disproved
that: the untyped TypeScript and bare `let x;` cases passed on `main`. The
real split depends on the node's type. A field the grammar defines but leaves
empty comes back as `null`; a field the node's type does not define at all
comes back as `undefined`. A JavaScript parameter is a bare `identifier` with
no `type` field, which is why only JavaScript crashed and graft's own
TypeScript always scanned cleanly. The packet and card were corrected before
GREEN, and the two passing cases stay as guards rather than being claimed as
reproductions.

The same correction cleared a suspected second bug. A `!== null` field check
in `src/warp/qualified-reference-bindings.ts` reads a field (`mod_item.body`)
that its grammar defines, so it gets `null` and is correct. No card was filed
for it.

## Verification

- `pnpm exec vitest run test/unit/operations/sludge-detector.test.ts test/unit/mcp/tools.test.ts test/unit/cli/main.test.ts test/unit/cli/doctor-posture.test.ts`:
  4 files, 72 tests passed.
- `pnpm typecheck`: clean.
- `pnpm lint`: clean.
- `git diff --check`: clean.
- Whole-repository `doctor --sludge` from the built CLI: completed, as above.

The full suite was not run: the change is confined to one detector module
and its unit file.

## Follow-up

- Filed `docs/method/backlog/bad-code/CLEAN_sludge-scan-aborts-on-one-file.md`:
  `detectSludge` still has no per-file error boundary, so the next grammar
  edge case would again cost the whole scan.
- Filed `docs/method/backlog/bad-code/CLEAN_read-tools-ignore-cwd.md`: see
  the dogfooding notes.

## Dogfooding notes

- Graft found its own bug: the crash surfaced only because the session used
  `doctor sludge=true` instead of shelling out.
- `read_range` and `safe_read` ignored the `cwd` argument and served files
  from the MCP server's own checkout. Reads aimed at this cycle's worktree
  returned the other branch's `CHANGELOG.md`. Recorded in
  `docs/miss-log.jsonl` and filed as
  `docs/method/backlog/bad-code/CLEAN_read-tools-ignore-cwd.md`.
