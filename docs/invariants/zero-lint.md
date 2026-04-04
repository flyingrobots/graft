# Zero lint errors, zero warnings

**Legend:** all

ESLint runs with maximum strictness (`strict-type-checked`).
Zero errors, zero warnings. No rule suppressions without
documented justification.

## If violated

Code quality drifts. Warnings accumulate into a noise floor
that hides real issues. Strictness erodes incrementally until
the linter is decoration.

## How to verify

- Pre-commit hook runs `pnpm lint` — commit blocked on failure
- CI runs lint on every push
- ESLint config promotes all warnings to errors
