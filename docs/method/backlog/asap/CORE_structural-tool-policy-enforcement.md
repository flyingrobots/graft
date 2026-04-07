# Structural-tool policy enforcement

`file_outline`, `graft_map`, `graft_diff`, and `graft_since` currently
read project or git-backed content without policy evaluation. Bring
those structural surfaces under an explicit policy contract.

Questions to settle:

- Should denied files be refused explicitly, omitted, or summarized?
- How should git-backed historical reads honor `.graftignore` and bans?
- What refusal shape should structural tools emit for parity with other
  MCP surfaces?

Done when:

- each structural tool has an explicit policy path
- historical and working-tree structural reads use the same policy
  inputs
- tests prove denied files do not leak through structural paths
