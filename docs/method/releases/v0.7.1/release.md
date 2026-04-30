# Release Design: v0.7.1

## Included Work

- Remove `src/` from the npm package `files` list.
- Move `tsx` from runtime `dependencies` to `devDependencies`.
- Run the published `graft` and `git-graft` bin from built
  `dist/cli/entrypoint.js`.
- Generate Claude hook commands that target built `dist/hooks/*.js`
  entry points.
- Run daemon child workers from compiled JavaScript when executing from
  `dist`.
- Declare `"sideEffects": false` in `package.json`.
- Add `prepublishOnly: pnpm release:check` to protect manual publishes.
- Update package/release tests to lock the distribution shape.

## Hills Advanced

- **Release hygiene**: npm consumers receive a smaller, clearer package
  surface built around `dist/`, not internal TypeScript source paths.
- **Runtime clarity**: `tsx` remains available for repo-local
  development and test scripts, but published runtime code no longer
  depends on it.
- **Setup truth**: generated hook configuration and documented hook
  commands now match what the published package actually contains.

## Sponsored Users

- **npm users** get a package that exposes the documented CLI/API
  contract without shipping internal source files.
- **Operators** get generated Claude hooks that work from the installed
  package without a TypeScript runtime loader.
- **Maintainers** get a prepublish guard that runs the release check
  before any manual publish attempt can proceed.

## Version Justification

**Patch** (`0.7.0` to `0.7.1`).

This release fixes package distribution posture and runtime dependency
shape. It does not add new commands, MCP tools, API exports, policy
behavior, or documented feature semantics.

## Migration

- No migration is required for normal CLI, MCP, or API usage.
- Operators who manually copied old Claude hook commands should replace
  `node --import tsx node_modules/@flyingrobots/graft/src/hooks/*.ts`
  with the generated `dist/hooks/*.js` commands from
  `graft init --write-claude-hooks`.

## Release Acceptance

This release is ready to tag when all of the following are true:

- `package.json` is bumped to `0.7.1`
- `CHANGELOG.md` has a `0.7.1` section
- `docs/releases/v0.7.1.md` is final
- `docs/method/releases/v0.7.1/verification.md` is filled with actual
  preflight/tag/publish evidence
- focused package-shape tests pass
- `pnpm release:check` passes on the final release commit
