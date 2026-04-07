# Cycle 0035 Retro — Versioned JSON Output Schemas

**Outcome:** Met

## What changed

- added a shared output-schema registry for MCP tools, CLI JSON
  commands, and the receipt block
- every MCP response now includes a versioned `_schema` marker
- `graft init` and `graft index` now support `--json`
- representative emitted payloads are validated against the declared
  schemas in tests

## What we learned

- versioning the contract is easiest when schema ids, versions, and
  validation helpers live in one place
- CLI JSON support is part of the contract story, not a separate nice
  to have
- the contract tests catch real drift quickly without forcing every
  handler to hand-roll its own validator

## Follow-on work

- surface-parity and control-plane work in `up-next`
