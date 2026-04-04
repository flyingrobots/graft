# Policy enforcement is total

**Legend:** CORE

Every `safe_read` call goes through `evaluatePolicy()`. There is
no code path that returns file content without policy evaluation.

## If violated

The governor is theater. Agents get unfiltered reads, context
burden is unmanaged, and the entire premise of graft fails.

## How to verify

- `grep` for `readFileSync` or `fs.read` in `src/operations/` —
  every occurrence must be followed by an `evaluatePolicy` call
- No MCP tool handler returns raw file content directly
- Tests: safe-read tests cover content, outline, and refusal paths
