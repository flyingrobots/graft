---
title: "Intentional degeneracy for agent safety"
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
