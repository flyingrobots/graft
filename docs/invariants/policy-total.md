# Policy enforcement is total

**Legend:** CORE
**Status:** Enforced for `safe_read`; broader surface fidelity planned

Every `safe_read` call goes through `evaluatePolicy()`. There is
no `safe_read` code path that returns file content without policy
evaluation.

This invariant is intentionally narrower than whole-product policy
fidelity. Other MCP tools, hooks, and CLI surfaces do not yet all pass
the same policy inputs or emit the same refusal shape. See cycle 0030
for the broader audit packet.

## If violated

The governor is theater. Agents get unfiltered reads, context
burden is unmanaged, and the entire premise of graft fails.

## How to verify

- `grep` for `readFileSync` or `fs.read` in `src/operations/` —
  every `safe_read` occurrence must be followed by an `evaluatePolicy`
  call
- Cache-hit and stale-cache branches in `src/mcp/tools/safe-read.ts`
  must re-check policy before returning cached data
- Tests: safe-read tests cover content, outline, and refusal paths
