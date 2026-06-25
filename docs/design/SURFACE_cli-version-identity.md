# SURFACE: CLI version identity

## Hill

Graft exposes its package identity consistently from the command line:
`graft --version` and `graft -V` print the npm package version, and grouped help
shows the same version so operators can verify the installed CLI without
starting a server, daemon, parser runtime, or repository read.

## Problem

Graft already exports `GRAFT_VERSION` for library and MCP surfaces, but the CLI
does not expose that version directly. Operators currently need to inspect the
installed npm package or infer the version from release notes. That makes
cross-tool release checks harder when jedit, Colorful, Graft, and other
Flying Robots tools need to prove which local binaries and package APIs are in
use.

## Acceptance Criteria

- `graft --version` prints `graft <package-version>` and exits successfully.
- `graft -V` behaves the same as `graft --version`.
- `graft help`, `graft --help`, and no-argument interactive help include the
  same package version.
- Version reporting does not require a git repository, Git version check, MCP
  server startup, daemon startup, or parser initialization.
- Existing grouped help and command routing remain unchanged.

## Playback Questions

- Does the CLI version output match `GRAFT_VERSION` from `package.json`?
- Does grouped help show the same version string before command groups?
- Does `--version` return before the Git-version guard runs?
- Do normal command parse errors still use the existing usage guidance?

## Non-goals

- Do not change the package version.
- Do not add release automation.
- Do not change MCP server version metadata.
- Do not introduce a shared Flying Robots CLI framework in this cycle.

## Test Strategy

- Add unit coverage for `--version` and `-V` against the existing in-process
  CLI harness.
- Extend grouped-help coverage to assert the semantic version identity, without
  pinning the full help transcript.
- Keep the existing CLI test suite as the focused validation surface.
