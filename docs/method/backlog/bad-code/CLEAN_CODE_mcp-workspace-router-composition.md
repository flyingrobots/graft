# Workspace router owns too many daemon concerns in one class

File: `src/mcp/workspace-router.ts`

Non-green SSJR pillars:
- SOLID 🟡

What is wrong:
- one class resolves repo/worktree identity, owns capability posture,
  manages session-local slice lifecycle, and caches repo-scoped WARP
  handles
- daemon transport and future multi-session work will make this seam
  broader unless the responsibilities split now

Desired end state:
- separate workspace resolution, capability policy, session-slice
  lifecycle, and repo-scoped WARP registry modules
- keep one orchestration facade without one giant responsibility blob

Effort: M
