# Policy check middleware

Instead of manually calling evaluatePolicy in every tool handler
that takes a file path, have the MCP tool registration wrapper
auto-check policy for any tool with a `path` argument.

Motivation: we forgot to call evaluatePolicy in changed_since and
it became a security bug (PR #1 review). This class of bug is
eliminated if the policy check is structural, not manual.

Pattern: registerFileTool(name, schema, handler) wraps the handler
with a policy check before delegating. If policy says refused, the
refusal is returned without calling the handler at all.
