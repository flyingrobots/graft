# Glossary

This glossary defines project-specific Graft terms used across design,
audit, method, and runtime documentation.

## Active Causal Workspace

The currently selected bounded line of work for a transport session.
It includes recent reads, stages, transitions, checkout footing, and
the current causal context. It is not automatically the same as the
whole repository or the whole daemon.

## Causal Provenance

The model Graft uses to explain why a structural state exists, not only
what bytes changed. It distinguishes transport/session plumbing from
the lawful line of work, and prefers degraded truth over fabricating a
single story from unrelated activity.

## Causal Workspace

The bounded local record of an active line of work. A causal workspace
tracks current footing and recent activity so Graft can answer whether
a session is continuing, diverging, or operating with incomplete
evidence.

## Checkout Epoch

The branch and base footing for the current worktree state. Branch
switches, merges, rebases performed outside Graft, and history rewrites
can create new checkout epochs even when the worktree path stays the
same.

## Commit Worldline

The durable structural history grounded in Git commits. It is the
canonical WARP-backed layer for committed structural facts.

## Governed Read

A file read that passes through Graft policy before content or
structure is returned. Governed reads may return content, a structural
outline, a cache hit, a structural diff, or a refusal.

## Observation Cache

The session-local memory of file snapshots already observed by an
agent. It enables unchanged rereads to become `cache_hit` responses and
changed rereads to become structural diffs.

## Ref View

A branch or reference comparison over the durable commit worldline. It
is a view over canonical history, not a separate durable worldline.

## Strand

A continuity lane for related causal work across bounded runtime
sessions. Strands are the intended unit for lawful handoff and future
causal collapse, but current Graft remains conservative about claiming
full multi-writer strand truth.

## Transport Session

The concrete MCP connection or daemon session carrying requests.
Transport sessions are runtime plumbing and can disappear or reconnect
without necessarily ending the causal line of work.

## WARP

Structural Worldline Memory. In Graft, WARP stores structural facts
about commits, symbols, files, and relationships so agents can ask
bounded structural questions without rereading entire source files.

## Worldline

An ordered history layer for repository state. Graft currently models
the commit worldline, ref views, and the workspace overlay as distinct
layers so dirty worktree state is not confused with durable committed
history.

## Workspace Binding

The daemon control-plane act that attaches a transport session to an
authorized repo/worktree. Repository-scoped tools require a coherent
binding before they can run in daemon mode.

## Workspace Overlay

The current dirty working tree and reactive edit layer. It is anchored
to a checkout epoch and remains separate from the canonical commit
worldline until changes are committed and indexed.
