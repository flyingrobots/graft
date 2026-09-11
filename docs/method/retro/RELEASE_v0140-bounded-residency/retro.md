# v0.14.0 release preparation retro

## Outcome

Initially prepared the release from merged PR #251 without changing runtime
source or locked dependency versions. Release review then identified the MCP
status schema-version defect, repaired with a red/green contract regression.
The locked dependency graph remains unchanged. Updated package/source-version metadata, dated the
changelog, documented the capacity error and client reconnect requirements,
and recorded local preflight and isolated MCP dogfood results. PR #258 merged
as `8d02bcf8`; signed tag `v0.14.0` launched release run `34586892333`.
All three jobs passed, and npm subsequently reported `latest: 0.14.0`.
The published package now runs locally as daemon PID 97570.

## Playback and drift

The final sequential release gate passed, including 2,371 Docker tests, ten public
contract tests, build, and the zero-high/critical security policy. Dogfood used
copied Graft source in a temporary repository. The default four-handle claim
still does not imply a byte or process memory limit. Publication and daemon
replacement were verified separately. npm's asynchronous processing continued
after Actions succeeded; the old daemon remained running until the exact
registry version became available and the new installation passed its checks.

The normal npm installation failed in `roaring@2.7.0` on Node 26. Its native
binary request returned 404, and the source fallback failed against V8.
Installing with dependency scripts disabled followed the repository's existing
policy. The installed WASM backend passed a bitmap round trip, and the installed
MCP server passed the isolated smoke check before cutover.

## Debt

Filed `CLEAN_moderate-dependency-advisories` with the eight moderate audit
entries, runtime/development dependency paths, fixed versions, owner, and
next-release reassessment. No dependency was silently changed to obtain green
validation. Existing WARP owner-inventory and byte-budget cards remain open.
No new cool-ideas cards were needed.

Also filed `CLEAN_node26-native-roaring-install` with the failing public install
command, native-build errors, verified local workaround, owner, and acceptance
boundary. The published release is not claimed to fix ordinary Node 26 npm
installation. No runtime source or dependency resolution was changed in the
receipt follow-up.

## Closure

The old daemon exited after SIGTERM following a fresh idle scheduler/worker
sample. Its 0.12.0 installation remains available for rollback. The new daemon
uses the same socket and preserved the sampled 68 workspace authorizations
across 30 repositories. Its new start time ends continuity with old session
and historical counter observations. Clients may need to reconnect.

The receipt follow-up changes documentation and retained observations only.
`pnpm lint`, `git diff --check`, and replay of the retained installed-package
smoke command passed. The regenerated backlog graph retains two pre-existing
unresolved references to `CLEAN_CODE_export-diff-semver-signature-as-patch`;
this card does not add an unresolved dependency. Review and merge the receipt
through the normal gate. Do not move the published tag. Release witness:
`docs/method/releases/v0.14.0/verification.md`.

## Retained evidence

The complete MCP smoke command and bounded results now live in the release
witness. Replaying the retained command passed the original observations.
No test or lint configuration changed to retain this evidence. The first
standalone `.mjs` placement failed typed-project lint and was replaced with
the complete shell command in Markdown. A trailing blank line in the retained
RED excerpt was removed in this documentation follow-up.

## Receipt review: dependency replay

Codex identified that the first installed smoke receipt retained only the
Graft package integrity, while future npm range resolution could change its
WARP, SDK, or bitmap dependencies. Retained the actual install manifest and
complete npm lockfile: all 193 dependency entries contain public registry URLs
and SHA-512 integrity values. The revised replay uses `npm ci` in a new
prefix and takes fixture source from the immutable release tag. It preserves
the running installation and does not claim platform-independent reproduction.

The retained-lock replay passed bitmap and MCP checks with the original
manifest and lockfile unchanged. An initial `npm ci --prefix` attempt failed
root-package validation on npm 11.12.1; running `npm ci` from inside the
owned prefix succeeded. Those setup failures are not product regression
failures. Local lint and the whitespace check passed.
