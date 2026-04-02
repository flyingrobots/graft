# Releases

## When to release

Release when externally meaningful behavior changes. Not every cycle
warrants a release.

- New commands → release
- Policy changes that affect agent behavior → release
- Bug fixes → release
- Internal refactors with no behavior change → no release
- Documentation-only changes → no release

## Version strategy

Semantic versioning. All packages in the monorepo (if it becomes one)
version in lock step.

- **Major**: breaking changes to the command surface, policy defaults,
  or MCP protocol.
- **Minor**: new commands, new reason codes, new policy options.
- **Patch**: bug fixes, performance improvements.

## Release checklist

1. CHANGELOG.md updated with all user-visible changes.
2. README.md updated if usage, interfaces, or understanding changed.
3. Version bumped in package.json.
4. All tests pass, lint clean.
5. Tag: `vX.Y.Z`.
6. Publish to npm: `pnpm publish --access public`.

## Pre-1.0

Until 1.0, the command surface and policy defaults may change between
minor versions. Pin exact versions if stability matters.
