# Policy fidelity audit across all tools and CLI commands

Policy handling is currently uneven across the product surface.
Some paths run `evaluatePolicy` centrally, some do it inside the
tool, some miss budget/session details, and the MCP path does not
yet look fully aligned with hook-side `.graftignore` handling.

This needs to become a deliberate contract, not an accident of
call-site structure.

Audit scope:
- Every MCP tool
- Every CLI command that reads project content
- Hook paths vs MCP paths vs CLI paths
- Session depth, budget, bans, and `.graftignore`
- Historical/ref reads as well as working-tree reads

Deliverable:
- One matrix that says, for every read surface, where policy is
  evaluated, what inputs it uses, and what refusal shape it emits
- Fixes for any missing or inconsistent enforcement
- Tests that prove the same banned file is handled the same way
  regardless of entry point
