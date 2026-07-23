# API_mcp-rest-sessions

## The Hill
Evolve the REST API bridge to support sandboxed, session-based playgrounds. Agents behind Web UIs need isolated environments where they can interact with the Graft API over a dedicated Git worktree without colliding with other active sessions or altering the host's primary working tree.

## Acceptance Criteria
- `POST /sessions` provisions a new sandboxed session.
  - It generates a unique `sessionId`.
  - It accepts an optional `{"repositoryUrl": "https://..."}` in the JSON body.
  - If `repositoryUrl` is provided, it clones that repository into the session directory (`git clone <repositoryUrl> <sessionsPath>/<id>`).
  - Otherwise, it creates an isolated Git worktree linked to the server's configured base repository (`git worktree add -b session-<id> <sessionsPath>/<id>`).
  - It instantiates a dedicated `repo_local` `GraftServer` tied to that new worktree/clone.
- `GET /sessions/:sessionId/tools` lists the available tools for that specific session.
- `POST /sessions/:sessionId/tools/:name` executes a tool within the context of that session's isolated `GraftServer` and worktree.
- The `startRestServer` configuration is extended to accept a `baseRepoPath` (the repo to branch from) and a `sessionsPath` (the directory to host the worktrees).

## Playback Questions
- Can multiple concurrent agents establish their own sessions and read/modify files in parallel without affecting each other's workspaces?
- Are the session `GraftServer` instances correctly initialized with the session's worktree as their `projectRoot`?
- Are errors returned properly (e.g., 404 for invalid session ID)?

## Non-Goals
- Automatic cleanup/garbage collection of old sessions and worktrees (this can be managed externally or added in a future milestone).
- Full security hardening (e.g., containerization or `chroot`). The isolation is at the Git worktree and GraftServer boundary.
- Support for complex network proxying for clones (relies on standard Git networking).

## Test Strategy
- Unit tests will spin up the REST server with a fixture base repo.
- A test will call `POST /sessions` to create a new session, asserting a 200 response and extracting the `sessionId`.
- The test will then verify that `POST /sessions/:sessionId/tools/file_outline` works correctly against the isolated worktree.
- Tests will ensure 404 is returned for unknown sessions.
