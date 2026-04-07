# Structural-tool policy enforcement

`file_outline`, `graft_map`, `graft_diff`, and `graft_since` currently
read project or git-backed content without policy evaluation. Bring
those structural surfaces under an explicit policy contract.

Direction:

- denied files should not leak through structural tools
- structural tools should activate the same policy inputs as other
  bounded-read surfaces
- refusal behavior should be explicit rather than silent omission

Open implementation question:

- what is the cleanest refusal/result shape for structural surfaces
  while preserving usable summaries?

Done when:

- each structural tool has an explicit policy path
- historical and working-tree structural reads use the same policy
  inputs
- tests prove denied files do not leak through structural paths
