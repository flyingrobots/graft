# Persistent monitor runtime composition is carrying too many concerns

`src/mcp/persistent-monitor-runtime.ts` currently owns:

- monitor persistence and state projection
- lifecycle state transitions
- timer scheduling
- authorization-anchor lookup
- WARP indexing execution
- backlog and health shaping

That is acceptable for the first real monitor slice, but it should be
split before more worker kinds or multi-repo coordination land there.

Desired cleanup:

- separate persistent monitor storage from live scheduler behavior
- isolate the `git_poll_indexer` worker from generic monitor runtime
  lifecycle logic
- keep health and backlog projection thin and machine-readable
