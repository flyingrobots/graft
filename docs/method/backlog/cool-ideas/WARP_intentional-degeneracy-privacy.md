---
title: "Intentional degeneracy for agent safety"
requirements:
  - "Policy engine (shipped)"
  - "Outline extraction (shipped)"
acceptance_criteria:
  - "Security-sensitive code regions can be tagged with a degeneracy policy"
  - "Tagged regions return structurally accurate but semantically opaque summaries (e.g., module purpose without implementation)"
  - "An agent reading a degenerate region cannot reconstruct credential values or security-critical logic"
  - "The outline for a degenerate region is honest about exported symbols and types but omits implementation bodies"
  - "Policy violations (attempts to bypass degeneracy via read_range) are blocked and logged"
---

# Intentional degeneracy for agent safety

Privacy is intentional injection of structural degeneracy
(OG-V). Some code regions (security-sensitive, credentials-
adjacent) should have intentionally high degeneracy.

Rather than banning reads entirely, return structurally accurate
but semantically opaque summaries: "This module handles
authentication" without revealing implementation details that
could be exfiltrated through the agent's context window.

This is a middle ground between full access and full refusal.
The outline is HONEST about structure but OPAQUE about
implementation. Controlled information hiding, not access denial.

Depends on: policy engine (shipped), outline extraction (shipped).

See: OG-V (privacy as intentional degeneracy).
