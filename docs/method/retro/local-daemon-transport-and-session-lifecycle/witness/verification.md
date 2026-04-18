---
title: "Verification witness"
---

# Verification witness

Cycle: `0053-local-daemon-transport-and-session-lifecycle`

## Commands

```bash
pnpm exec vitest run test/integration/mcp/daemon-server.test.ts test/unit/cli/main.test.ts
pnpm exec vitest run test/unit/mcp/workspace-binding.test.ts test/integration/mcp/server.test.ts test/integration/mcp/daemon-server.test.ts test/unit/cli/main.test.ts
pnpm lint src/mcp/warp-pool.ts src/mcp/workspace-router.ts src/mcp/server.ts src/mcp/daemon-server.ts src/cli/main.ts test/unit/cli/main.test.ts test/integration/mcp/daemon-server.test.ts
pnpm exec tsc --noEmit --pretty false 2>&1 | rg 'src/mcp/daemon-server.ts|src/mcp/warp-pool.ts|src/mcp/workspace-router.ts|src/mcp/server.ts|src/cli/main.ts|test/integration/mcp/daemon-server.test.ts|test/unit/cli/main.test.ts'
```

## Results

- daemon + CLI slice: `2` files, `9` tests passed
- broader MCP + daemon + CLI slice: `4` files, `24` tests passed
- targeted lint for touched daemon files passed
- targeted strict-TS grep returned no errors for the touched files
