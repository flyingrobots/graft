---
title: "v0.6.0 code review fixes"
legend: CORE
cycle: CORE_v060-code-review-fixes
---

# v0.6.0 code review fixes

## Sponsors

- Human: James (reviewer, release gatekeeper)
- Agent: Claude (fix implementation, parallel execution)
- Agent: Codex (Level 10 code review, finding discovery)

## Hill

Fix all findings from the Codex Level 10 code review of the v0.6.0
release candidate so the release ships with zero known security,
correctness, or resource-management defects on the books.

This slice is complete when:

- the path resolver confines absolute paths and resolves symlinks
- WARP symbol node IDs disambiguate same-named symbols in one file
- WARP indexer propagates git failures instead of swallowing them
- daemon session directories are cleaned up on close
- rotating log rotation cannot erase the entire log
- graft_map respects output size caps and session budget

## Playback Questions

### Human

- [ ] Does the path resolver reject absolute paths outside the project root?
- [ ] Is the bad-code directory empty after fixes?

### Agent

- [ ] Does createRepoPathResolver reject /etc/passwd when root is /repo?
- [ ] Does the path resolver detect symlink escapes via realpathSync?
- [ ] Do two same-named methods in different classes get distinct WARP node IDs?
- [ ] Does a git failure during indexing produce an explicit error result?
- [ ] Is the daemon session directory removed on session close?
- [ ] Does an oversized log entry preserve itself instead of erasing the log?
- [ ] Does graft_map truncate when exceeding MAX_MAP_FILES or MAX_MAP_BYTES?
- [ ] Does graft_map respect exhausted session budget?
