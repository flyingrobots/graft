# Contributing to Graft

Thank you for your interest in contributing.

## Development process

Graft uses **The Method** — a cycle-based development process. See
[METHOD.md](METHOD.md) for the full description.

The short version:

1. Work is tracked in `docs/method/backlog/` as markdown files.
2. Pulled work becomes a numbered cycle in `docs/design/<NNNN-slug>/`.
3. Every cycle follows: Design → RED → GREEN → Playback → PR → Close.
4. Every cycle ends with a retrospective, successful or not.

## Getting started

```bash
git clone https://github.com/flyingrobots/graft.git
cd graft
pnpm install
pnpm test
```

## Before submitting a PR

- All tests pass: `pnpm test`
- Lint is clean: `pnpm lint`
- TypeScript compiles: `pnpm tsc --noEmit`
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
- CHANGELOG.md is updated for user-visible changes.

## Git hooks

The repo uses plain shell scripts in `scripts/hooks/`:

- **pre-commit**: lint must pass.
- **pre-push**: tests must pass.

Configure them locally:

```bash
git config --local core.hooksPath scripts/hooks
```

## Code style

- ESLint with maximum strictness. Zero warnings, zero errors.
- Tests are the spec. Write failing tests first.

## License

By contributing, you agree that your contributions will be licensed
under the Apache 2.0 License.
