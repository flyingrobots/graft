# Cycle 0007 — Release Prep (0.1.0)

**Type:** Debt + Feature
**Legend:** CORE
**Sponsor human:** James
**Sponsor agent:** Claude

## Hill

`npx @flyingrobots/graft` starts a working MCP server. The package
is published to npm. Tool descriptions help agents discover what
graft does. No broken stubs, no wrong language detection, no stale
docs.

## Items pulled (5)

1. **bin entry point + npm config** — bin/graft.js, exports, files
2. **run_capture stub** — implement or remove
3. **MCP tool descriptions** — agent-facing schema docs
4. **Lang detection fix** — .js files parsed as TS in server paths
5. **VISION.md regeneration** — stale public-facing doc

## Non-goals

- No new features.
- No WARP integration.
- No CLEAN_CODE migration.
