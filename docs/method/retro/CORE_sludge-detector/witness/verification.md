# Verification: CORE_sludge-detector

Date: 2026-04-26
Branch: `release/v0.7.0`

## Commands

| Command | Result |
| --- | --- |
| `pnpm exec vitest run test/unit/operations/sludge-detector.test.ts test/unit/mcp/tools.test.ts test/unit/cli/main.test.ts test/unit/contracts/output-schemas.test.ts` | pass: 4 files, 58 tests |
| `git diff --check` | pass |
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm test` | pass: 173 files, 1344 tests |

## Notes

- The operation test proves typedef/class imbalance, JSDoc cast density,
  homeless constructor detection, and free-function data-behavior
  detection.
- The clean-factory test proves `return new X()` is not reported as a
  homeless constructor.
- The CLI test proves the `graft doctor --sludge --path src --json`
  alias routes through the doctor peer command.
