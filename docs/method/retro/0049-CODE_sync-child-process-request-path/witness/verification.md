# Verification

- `rg -n "execFileSync|spawnSync|node:child_process" src --glob '!src/adapters/**'`
  Result: no matches
- `rg -n "node:path" src/operations`
  Result: no matches
- `pnpm exec vitest run test/unit/git/diff.test.ts test/unit/operations/state.test.ts test/unit/operations/graft-diff.test.ts test/unit/mcp/precision.test.ts test/unit/mcp/code-refs.test.ts test/unit/mcp/run-capture.test.ts test/unit/mcp/layered-worldline.test.ts test/unit/warp/indexer.test.ts test/unit/warp/directory.test.ts test/unit/warp/since.test.ts`
  Result: `10` files passed, `83` tests passed
- `pnpm lint`
  Result: passed
- `pnpm test`
  Result: `45` files passed, `551` tests passed
