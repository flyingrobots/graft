# API_mcp-rest-sessions

## Outcomes
- Evolved the REST API bridge to support sandboxed, session-based playgrounds.
- Implemented `POST /sessions` which generates a UUID, executes `git worktree add -b session-<uuid>` to create a fresh worktree from the base repository, and instantiates an isolated `repo_local` `GraftServer`.
- Implemented `GET /sessions/:id/tools` to list tools available within that isolated session workspace.
- Implemented `POST /sessions/:id/tools/:name` to route tool calls directly to the isolated `GraftServer`, ensuring safe reads/writes are contained within that worktree.
- Verified functionality via an automated test using the `createFixtureWorkspace` harness to confirm isolation and behavior.

## Debt / Surprises
- `git worktree add` requires the target repository to be checked out and available locally (not a bare clone, or if bare, handled accordingly). The API currently assumes `baseRepoPath` is a valid git repository.
- There is currently no mechanism to clean up abandoned sessions/worktrees. In a long-running environment, this will leak disk space over time without a reaper service.

## Follow-on
- Implement garbage collection for inactive sessions (deleting the worktree directory and pruning the git worktree).
- Add endpoint `POST /sessions/clone` to support cloning an arbitrary remote git repository URL instead of just using a single local `baseRepoPath`, allowing users to provide their own target repo for indexing.
