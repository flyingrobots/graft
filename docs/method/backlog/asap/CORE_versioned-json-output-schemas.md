# All tools and CLI commands need explicit versioned JSON schemas

Every structured output surface should have an explicit schema and a
versioned contract.

Right now the product emits structured JSON in many places, but the
shape is often implicit in tests and implementation details rather
than declared as a first-class interface. That makes compatibility
fragile for agents, wrappers, and future refactors.

Scope:
- MCP tool results
- CLI JSON output
- Any machine-readable receipts or diagnostics

Requirements:
- Each surface declares an explicit JSON schema
- Each schema is versioned
- Breaking shape changes require a version bump
- Tests validate emitted payloads against the declared schema

Goal:
- Agents can depend on output shapes intentionally instead of
  reverse-engineering them from examples or implementation code
