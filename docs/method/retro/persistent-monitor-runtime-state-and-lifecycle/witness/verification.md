---
title: "Verification"
---

# Verification

- `pnpm exec vitest run test/unit/mcp/persistent-monitor.test.ts test/integration/mcp/daemon-server.test.ts test/unit/contracts/output-schemas.test.ts test/unit/cli/main.test.ts`
- `pnpm lint`
- `pnpm test`
- `pnpm exec tsc --noEmit --pretty false 2>&1 | rg 'persistent-monitor-runtime|daemon-server|src/mcp/server.ts|src/mcp/context.ts|daemon-monitors|monitor-start|monitor-pause|monitor-resume|monitor-stop|src/contracts/capabilities.ts|src/contracts/output-schemas.ts|src/mcp/burden.ts|test/unit/mcp/persistent-monitor.test.ts|test/unit/contracts/output-schemas.test.ts|test/integration/mcp/daemon-server.test.ts|test/unit/cli/main.test.ts'`
  - no matches
