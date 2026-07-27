# API_mcp-rest-sessions

## The Hill
Evolve the REST API bridge to support sandboxed, session-based playgrounds. Agents behind Web UIs need isolated environments where they can interact with the Graft API over a dedicated Git worktree without colliding with other active sessions or altering the host's primary working tree.

The REST-session harness must preserve the operator's Git identity as part of
that isolation boundary. Starting the harness may not write system, global, or
ambient repository Git configuration. Test authorship belongs in explicit
process environment variables or in the isolated session repository.

The Docker witness must also sever repository authority from the host. Source
enters the image as build-context copies, with host Git metadata excluded. The
running container has no bind mount or Docker volume, initializes a fresh
image-local repository at `/app`, and has no Git remotes.

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
- Starting the REST-session entrypoint leaves the caller's exact global Git
  configuration bytes unchanged.
- The REST-session image and runtime contain no global Git identity write.
- Any test-only author or committer identity is process-scoped or explicitly
  local to an isolated test repository.
- The image receives source through `COPY`, not a host bind mount or Docker
  volume, and the running REST-session container reports no mounts.
- Host `.git` metadata is excluded from the build context. The image initializes
  its own `/app/.git` repository from the copied files.
- The image removes `origin` if one exists and fails its build unless the
  image-local repository has no remotes.

## Playback Questions
- Can multiple concurrent agents establish their own sessions and read/modify files in parallel without affecting each other's workspaces?
- Are the session `GraftServer` instances correctly initialized with the session's worktree as their `projectRoot`?
- Are errors returned properly (e.g., 404 for invalid session ID)?
- Does entrypoint startup preserve an isolated sentinel global Git
  configuration byte for byte?
- Does Docker report an empty mount list for the running REST-session
  container?
- Does `/app` resolve to the image-local `/app/.git` repository with an empty
  remote list?

## Non-Goals
- Automatic cleanup/garbage collection of old sessions and worktrees (this can be managed externally or added in a future milestone).
- General container or `chroot` hardening beyond severing the REST-session
  fixture from host repository authority.
- Support for complex network proxying for clones (relies on standard Git networking).
- Repairing or selecting an operator's existing Git identity.

## Test Strategy
- Unit tests will spin up the REST server with a fixture base repo.
- A test will call `POST /sessions` to create a new session, asserting a 200 response and extracting the `sessionId`.
- The test will then verify that `POST /sessions/:sessionId/tools/file_outline` works correctly against the isolated worktree.
- Tests will ensure 404 is returned for unknown sessions.
- A subprocess regression will start the real entrypoint with
  `GIT_CONFIG_GLOBAL` bound to a disposable sentinel file, wait for the server
  to listen, and assert the file's exact bytes are unchanged. The test must
  never point Git at the operator's real global configuration.
- The Docker E2E will inspect the running container and assert that it has no
  mounts, `/app/.git` is its repository, and `git remote` returns no entries.
