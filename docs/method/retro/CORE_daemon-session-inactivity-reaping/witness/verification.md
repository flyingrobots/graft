# Daemon session inactivity and orphan reaping verification

Cycle: `CORE_daemon-session-inactivity-reaping`

## RED receipts

Every repair used either the held implementation's direct failure or a bounded
mutation of the exact guard under test. Representative receipts:

| Invariant | RED observation | GREEN commit |
| :--- | :--- | :--- |
| Real in-flight ownership | Removing `activeRequests === 0` reaped the held SSE session: expected 0, received 1 | `53e09384` |
| Pre-body admission | A held partial POST body was reaped before parsing completed | `700535fe` |
| Transactional connect | Injected `McpServer.connect` failure left one active session and scratch directory | `6ea9af50` |
| Positive TTL domain | Every invalid TTL class was initially accepted | `31c91956` |
| Node timer domain | Negative, non-finite, fractional, and overflowing intervals reached invalid scheduling behavior | `859832e5` |
| Monotonic inactivity | A forward `Date.now()` jump retired a session with no elapsed monotonic TTL | `3d59f302` |
| Crash-orphan recovery | A valid prior-process UUID directory survived restart | `4fdced68` |
| Shared terminal transition | Concurrent terminal causes duplicated cleanup before state/promise convergence | `898b123a` |
| Truthful cleanup | A forced directory failure was counted as successful deletion | `0793c2eb` |
| Invalid clock | Non-finite/regressing samples were not surfaced as a failed sweep | `62cbf598` |
| Pending construction | Startup/sweep races selected a still-owned construction directory | `1b073453`, `93bf5ee1` |
| Host shutdown fence | Construction, sweeps, or termination could outlive daemon-root authority | `a71f665a`, `c94af15e` |
| Scheduled sweep bound | One blocked sweep accumulated ten duplicate observers/diagnostics | `9e135713` |
| Root authority | Socket preparation preceded exclusive root claim | `31027739` |
| Unsafe sessions root | Startup followed a sessions-root symlink toward external data | `ee2a7182` |
| Legacy identity | An impossible UUID version/variant was treated as old Graft state and deleted | `a69bb208` |
| Legacy live endpoint | Custom-endpoint startup scanned state while an old default-endpoint daemon was live | `f0399c6d` |
| Root-owner ABA | Delayed stale takeover could remove a newer canonical owner record | `eedc99ec` |
| Atomic owner publication | A direct canonical write exposed partial/crash-truncated owner state | `93b0f9a8` |
| PID reuse | A live recycled PID indefinitely pinned a dead owner's record | `83b50a70` |
| Boundary allowlist | Canonical `pnpm test` failed the explicit PathOps boundary on `daemon-storage-ownership.ts` | `1af06bc3` |
| Default values | Mutating 30 minutes to 29 failed exactly the new default assertion: 1 failed, 40 skipped | `b39908ff` |
| Transport error | Removing the `onerror` terminal call left `activeSessions == 1`: 1 failed, 41 skipped | `0e141ab8` |
| Session identity ABA | A repeated UUID was accepted with HTTP 200 while prior deletion was gated | `6e741f54` |
| Marker rollback | Moving scratch ownership after marker publication left one UUID directory | `0e43ec29` |
| Registration rollback | Skipping rollback unregistration left one active control-plane transport | `0e43ec29` |
| Terminal idempotence | Removing promise reuse plus map-identity fences produced two unregister calls | `b5134bec` |
| Already-closed transport | Forcing transport-close termination through protocol close produced one unexpected `McpServer.close()` call | post-Retro review repair |
| Three-claimant root-owner ABA | Pausing displaced-owner restoration let a third publisher succeed: expected `false`, received `true` | post-Retro review repair |
| Late legacy endpoint | A custom-endpoint sweep deleted one unmarked live legacy directory: expected 0, received 1 | post-Retro review repair |
| Multiple retained clock failures | The first valid sweep reported one rejected sample but silently cleared the second: expected `NEGATIVE`, received `null` | post-Retro review repair |
| Post-start sessions-root swap | A periodic sweep followed a replacement root symlink and removed one externally targeted session directory | post-Retro review repair |
| Mid-scan sessions-root swap | Swaps before enumeration and after marker inspection both redirected recursive removal into an external owned-session fixture | post-Retro review repair |
| Claim-release rollback | An injected post-rename claim-release error stranded a live owner and made immediate reacquisition fail | post-Retro review repair |
| Default-endpoint bind order | A competing legacy listener bound during the gated cleanup window and the new daemon discovered the collision only after scanning | post-Retro review repair |
| Unsafe live-session cleanup | A symlink refusal was labeled retryable even though the next sweep preserved it permanently | post-Retro review repair |
| Sweep/shutdown diagnostic ownership | One gated removal failure appeared twice in the shutdown aggregate through the sweep and termination registry | post-Retro review repair |
| Diagnostic-independent lifecycle proof | Suppressing the scheduled-preservation and transport-cleanup log emissions caused one timeout and one missing-diagnostic assertion | post-Retro review repair |
| Live-cleanup sessions-root swap | Replacing `sessions` with an external link immediately before DELETE removed the external same-ID directory | post-Retro review repair |
| Mid-sweep retained clock failure | While the first expired session's deletion was gated, an invalid request sample on the second still let the sweep retire both with no failure | post-Retro review repair |
| Generic-Unix same-second PID reuse | Two distinct process witnesses under one `ps lstart` second produced the same persisted owner identity | post-Retro review repair |
| Post-validation live-child replacement | Cleanup returned `true` without reaching the replacement hook, leaving the validated pathname vulnerable to recursive deletion | post-Retro review repair |
| Sessions-root retry taxonomy | A transient root-identity refusal reported `retryable: false` even though restoring the parked root made the orphan removable | post-Retro review repair |
| Claim-churn deadline | A stale claim vanished after its record was read; despite the expired deadline, the next loop iteration reacquired ownership successfully | post-Retro review repair |
| Post-inspection orphan replacement | Replacing an eligible UUID child after its ownership marker was read made the scanner delete the unrelated replacement at that pathname | post-Retro review repair |
| Pre-cleanup live-child replacement | Replacing an initialized live-session directory before terminal cleanup made cleanup derive authority from and delete the unrelated replacement inode | post-Retro review repair |
| Missing runtime sessions root | Renaming away the established root before expiry made cleanup recreate an empty root and strand the live scratch without a failure | post-Retro review repair |
| Post-quarantine root rename | Renaming the sessions root after child quarantine left only an unknown `.graft-removing-*` entry that later scans could not retry | post-Retro review repair |

## Focused GREEN

```text
pnpm exec vitest run test/unit/mcp/daemon-session-reaper.test.ts
```

Result: pass; 1 file, 66 tests.

The focused suite includes exact-value configuration defaults, invalid option
tables, monotonic/refusal/rebase behavior, streaming and pre-body barriers,
concurrent references, every terminal cause, identity reservation and late
callback reuse, construction rollback boundaries, startup and periodic orphan
discovery, hostile paths, root-owner races, cleanup debt, shutdown fences, and
structured public errors.

## Canonical isolated validation

```text
pnpm test
```

Latest completed behavior-tree result at `a81a3f1e`: pass; 259 files and 2,118
tests in 96.00 seconds. The earlier `50e8aa77` candidate passed 258 files and
failed only the new generic-Unix identity test because that test forced Darwin
`ps` flags inside Alpine. The forward repair first passed the isolated
regression in Alpine, then passed the complete suite. The latest result also
includes the three current-head review repairs for live-child replacement,
sessions-root retry classification, and bounded claim churn.

The command uses the repository's Docker-isolated test runner. The earlier
exact-tree run at `83b50a70` passed 258 files and 2,095 tests and failed one of
259 files only because the new storage adapter had not yet been admitted by the
explicit PathOps boundary. `1af06bc3` repaired that one classified boundary.
The final exact-tree run passed without failed, flaky, retried, or unexplained
tests.

## Static gates

| Gate | Command | Result |
| :--- | :--- | :--- |
| Focused lifecycle | `pnpm exec vitest run test/unit/mcp/daemon-session-reaper.test.ts` | pass; 1 file, 66 tests |
| Full isolated suite | `pnpm test` | behavior tree at `a81a3f1e` passed 259 files, 2,118 tests in 96.00 seconds |
| Lint | `pnpm lint` | pass |
| Types | `pnpm typecheck` | pass |
| Build | `pnpm build` | pass |
| Whitespace | `git diff --check` | pass |

## Review and pagination witness

A full GraphQL refresh at `b5134bec` fetched inline review threads with nested
comments, global PR comments, and reviews:

```text
review threads: 39; hasNextPage=false
global comments: 22; hasNextPage=false
reviews: 21; hasNextPage=false
nested thread comment pages remaining: 0
```

Three threads were unresolved at that refresh. The construction-boundary and
genuinely reentrant-termination threads matched repairs `0e43ec29` and
`b5134bec` and were resolved through GraphQL. The sole remaining thread requires
this local Retro and must be resolved only after the artifact, canonical suite,
and commit exist.

The exact-head post-Retro Codex pass increased the fully paginated surface to
40 threads, 26 global comments, and 22 reviews. It opened one documentation-
truth thread for the already-closed transport distinction; that thread is
resolved only after the behavioral assertion, corrected prose, validation, and
published repair commit exist.

The closure refresh at `553f2860` exhausted all pages across 49 review threads,
32 global comments, 25 reviews, and every nested thread-comment connection. No
inline thread remained unresolved. One actionable CodeRabbit review-body note
still identified diagnostic-string coupling in two lifecycle tests; the final
repair replaces those assertions with scan-completion/single-flight evidence
and failed-cleanup orphan convergence.

The post-repair refresh at `a81a3f1e` exhausted all pages across 54 review
threads, 37 global comments, 28 reviews, and every nested thread-comment
connection. No inline thread remained unresolved. The latest CodeRabbit global
review-body finding is closed by the loop-boundary deadline regression, but a
substantive third-party review has not yet completed against this repaired
behavior head.

## Scope witness

The branch changes daemon session timing, state/termination, transactional
construction, root/session ownership, orphan scanning, typed sweep results,
focused tests, MCP lifecycle documentation, changelog truth, this design
packet, and this Retro. It does not change dependencies, generated schemas,
remote transport, WARP residency/eviction, repository-local stdio lifecycle,
or release configuration.
