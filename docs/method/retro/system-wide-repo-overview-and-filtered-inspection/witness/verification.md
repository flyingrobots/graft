---
title: "Verification"
---

# Verification

- `pnpm exec vitest run test/unit/mcp/daemon-repos.test.ts test/unit/mcp/workspace-binding.test.ts test/unit/mcp/persistent-monitor.test.ts test/integration/mcp/daemon-server.test.ts test/unit/contracts/output-schemas.test.ts`
- `pnpm lint`
- `pnpm test`
- `pnpm exec tsc --noEmit --pretty false 2>&1 | rg 'daemon-repos|src/mcp/server.ts|src/mcp/context.ts|src/contracts/capabilities.ts|src/contracts/output-schemas.ts|src/mcp/burden.ts|test/unit/mcp/daemon-repos.test.ts|test/integration/mcp/daemon-server.test.ts|test/unit/contracts/output-schemas.test.ts'`
  - no matches
- `git diff --check`
