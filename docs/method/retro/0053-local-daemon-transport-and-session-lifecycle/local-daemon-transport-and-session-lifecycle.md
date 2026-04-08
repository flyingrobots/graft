# Local daemon transport and session lifecycle Retro

Design: `docs/design/0053-local-daemon-transport-and-session-lifecycle/local-daemon-transport-and-session-lifecycle.md`
Outcome: Shipped a separate `graft daemon` runtime on a local-only Unix socket / named pipe transport, with `/mcp` and `/healthz`, transport-owned daemon sessions, explicit session close via MCP DELETE, and shared repo-scoped WARP pooling across same-repo daemon sessions while leaving repo-local `graft serve` unchanged.

## What changed

- added `src/mcp/daemon-server.ts` as the daemon host and transport
  lifecycle owner
- added `src/mcp/warp-pool.ts` so repo-scoped WARP sharing can live at
  the daemon host rather than inside one session router
- wired `graft daemon` into the CLI without changing `serve`
- verified socket-backed daemon health, session open/close, and same-repo
  WARP reuse in `test/integration/mcp/daemon-server.test.ts`
- updated product and architecture docs to distinguish repo-local stdio
  from the new same-user local daemon runtime

## Playback answers

- `graft daemon` is now a real, separate runtime path.
- The daemon is local-only by transport: Unix socket or Windows named
  pipe, no default TCP listener.
- Liveness is inspectable at `/healthz`.
- MCP sessions open on initialize and close on DELETE.
- Same-repo daemon sessions now share one repo-scoped WARP pool by
  default.
- Repo-local `graft serve` remains the standard editor bootstrap path.

## Verification

See `docs/method/retro/0053-local-daemon-transport-and-session-lifecycle/witness/verification.md`.

## New Debt

- `docs/method/backlog/bad-code/CLEAN_CODE_mcp-daemon-server-lifecycle-composition.md`
