# CLI Version Identity Retro

## Outcome

Met. Graft now reports the npm package version through `graft --version`,
`graft -V`, and grouped CLI help without touching repository guards, MCP
startup, daemon startup, or parser initialization.

## What changed

- Added `docs/design/SURFACE_cli-version-identity.md`.
- Reused the existing `GRAFT_VERSION` package identity in the CLI composition
  root.
- Added in-process CLI coverage for `--version`, `-V`, grouped help, and
  bypassing the Git-version guard.
- Recorded the release-visible behavior in `CHANGELOG.md`.

## Validation

See [verification.md](./witness/verification.md).

## Follow-up debt

None filed. This slice does not introduce a shared Flying Robots CLI framework;
that broader cross-tool convention belongs outside this Graft-only cycle.
