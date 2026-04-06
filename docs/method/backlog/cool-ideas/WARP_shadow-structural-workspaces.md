# Shadow structural workspaces

Each agent gets an isolated structural view — a Shadow Working
Set (SWS) over the WARP graph. Agents make speculative structural
changes without affecting each other. Collapse deterministically
when ready.

Multi-agent collaboration without coordination overhead. No locks,
no turn-taking. Each agent's structural observations and writes
live in their own strand. The CRDT merges them at collapse time.

"Agent A is refactoring auth. Agent B is adding a feature to
billing. Their structural workspaces are isolated. When both
finish, their strands collapse into a single coherent worldline."

Depends on: WARP Level 1 (shipped), git-warp Strands, multi-writer
support (currently single-writer).

See also: JIT (~/git/jit) — Shadow Working Sets.
