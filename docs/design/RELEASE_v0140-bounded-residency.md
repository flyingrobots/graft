# Release v0.14.0: bounded graph residency

## Hill

Publish the reviewed LRU implementation from PR #251 as an immutable npm
artifact and replace the local daemon with that artifact. The running process
must expose the new resident accounting and use the default four-handle limit.

The release baseline is `c08d427e`, following `v0.13.0`. The only intervening
merges are PR #251 and the testing-policy adoption in PR #255.

## Acceptance

- Package version and structural-history source-package metadata agree on
  `0.14.0`; no graph schema or dependency changes are included.
- The sequential release preflight and isolated MCP dogfood pass.
- A reviewed release-preparation PR merges through the normal gates.
- Signed tag `v0.14.0` points to the merged `main` commit.
- Actions sanity, GitHub Release, and npm publish each succeed; registry
  version and integrity metadata identify the delivered package.
- Install into a new version directory and verify the executable before
  replacing the launcher symlink.
- Recheck the old daemon's jobs and workers before graceful termination.
  Start the new daemon on the existing same-user socket and verify its PID,
  loaded package path, readiness, and resident accounting.

## Playback questions

- Does the published package carry the reviewed four-handle LRU?
- Can an operator distinguish package publication from daemon replacement?
- What happens when all slots are pinned, or existing MCP clients reconnect?
- Which evidence proves the new process started from the published artifact?

## Non-goals

No byte/RSS budget, HTTP removal, package split, broader inspector, source
freshness claim, or attribution of the earlier 7 GB process is included.
Daemon restart ends transport sessions. Existing clients may need to reconnect;
session continuity across process replacement is not promised.

The version justification, migration guidance, and release gates are in the
[release packet](../method/releases/v0.14.0/release.md).

## Release review repairs

The required `activeWarpResidents` field changed strict daemon-status schemas
while its MCP metadata still selected version `1.0.0`. Before publishing,
`graft.mcp.daemon_status` must advertise `2.0.0`. There is no registered
`graft.cli.daemon_status` JSON contract: the CLI renders a human status model.
Its existing `ok | degraded` projection is preserved. Other output contracts
retain their current versions. A narrow public-schema
regression must fail on the old metadata and pass after version selection is
corrected. Existing output-contract tests then verify complete tool responses.

Retain the MCP dogfood runner and a bounded result record under the release
witness. The runner must identify its source checkout, use temporary
Git state, and preserve the request sequence and assertions for replay.

## Post-publication receipt

Retain the local installation's package manifest and complete integrity-bearing
lockfile with its smoke command. Replay must use `npm ci` in a new temporary
prefix and read fixture source from the release tag, so a later dependency
range resolution or checkout edit cannot silently change the recorded input.
The replay must leave the running version directory untouched.

Retain observed daemon commands, executable and Node paths, the checked Node
version, socket path, and a timestamped follow-up process sample. A historical
PID alone does not identify an executable after process exit or PID reuse.
Keep unavailable exact sample times explicit rather than reconstructing them.
