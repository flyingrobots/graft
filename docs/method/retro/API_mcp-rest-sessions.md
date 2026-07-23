# API_mcp-rest-sessions

## Outcomes
- Evolved the REST API bridge to support sandboxed, session-based playgrounds.
- Implemented `POST /sessions` which generates a UUID. It accepts an optional `repositoryUrl` to clone an arbitrary remote repository via `git clone`. If omitted, it executes `git worktree add -b session-<uuid>` to create a fresh worktree from the base repository. It then instantiates an isolated `repo_local` `GraftServer`.
- Implemented `GET /sessions/:id/tools` to list tools available within that isolated session workspace.
- Implemented `POST /sessions/:id/tools/:name` to route tool calls directly to the isolated `GraftServer`, ensuring safe reads/writes are contained within that worktree.
- Verified functionality via an automated test using the `createFixtureWorkspace` harness to confirm isolation and behavior.

## Debt / Surprises
- `git worktree add` requires the target repository to be checked out and available locally (not a bare clone, or if bare, handled accordingly). The API currently assumes `baseRepoPath` is a valid git repository.
- `git clone` relies on standard Git networking. Private repositories currently require authentication to be handled externally (e.g. via SSH agent, git credentials, or embedded tokens in the URL).
- There is currently no mechanism to clean up abandoned sessions/worktrees. In a long-running environment, this will leak disk space over time without a reaper service.

## Follow-on
- Implement garbage collection for inactive sessions (deleting the worktree directory and pruning the git worktree).
