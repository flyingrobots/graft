# Sync child_process calls on request paths block testability and scale

Files:
- `src/mcp/repo-state.ts`
- `src/mcp/tools/run-capture.ts`
- `src/mcp/tools/code-refs.ts`
- `src/mcp/tools/git-files.ts`
- `src/mcp/tools/precision.ts`
- `src/git/diff.ts`
- `src/warp/indexer.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- SOLID 🔴

What is wrong:
- multiple product paths still use `execFileSync` directly
- this couples core behavior to the process environment and makes fast,
  isolated tests harder
- under heavier multi-agent/server workloads, sync shelling can become
  a latency and availability problem

Desired end state:
- introduce a shell/git execution port with bounded async operations,
  timeouts, and test fakes
- move request-path git observation and command execution behind that
  seam

Effort: L
