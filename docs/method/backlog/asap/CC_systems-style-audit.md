# Systems-Style JavaScript Code Audit

Full audit of every source file against the Systems-Style JavaScript
standard. Score each file on:

- **Runtime truth (P1)** — are domain concepts runtime-backed classes
  or plain objects/interfaces?
- **Boundary validation (P2)** — are untrusted inputs parsed through
  constructors/schemas, or cast with `as`?
- **Behavior on type (P3)** — does behavior live on the owning type,
  or is it dispatched by tag switching?
- **Schemas at boundaries (P4)** — are schemas at the edge, domain
  types inside?
- **Serialization separation (P5)** — is encoding the codec's
  problem, or tangled with domain logic?
- **SOLID** — Single responsibility, Open/closed, Liskov, Interface
  segregation, Dependency inversion
- **DRY** — duplicated logic, missed abstractions

## Deliverable

A scorecard per source file with:
- Current score per dimension
- Specific violations with file:line references
- Prioritized fix list (what to migrate first)
- Backlog items for each migration chunk

## Priority

Top of ASAP. The audit informs which CLEAN_CODE cycles to pull
first and prevents us from building more debt on a weak foundation.

Effort: M
