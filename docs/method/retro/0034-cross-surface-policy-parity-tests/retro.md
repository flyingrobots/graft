# Cycle 0034 Retro — Cross-Surface Policy Parity Tests

**Outcome:** Met

## What changed

- the 0030 policy matrix now has executable witnesses
- hard-denial parity is covered across Claude hooks and bounded-read MCP
  tools
- `.graftignore` denial parity is covered across precision and
  structural MCP tools
- soft-pressure behavior is covered for hooks and `safe_read`
- historical/git-backed denial parity is covered

## What we learned

- parity does not mean identical payloads; it means equivalent policy
  outcomes inside each surface's native contract
- the hook/MCP relationship is now crisp in tests: hard denials align,
  while soft pressure differs intentionally
- the remaining readiness gap is no longer policy implementation; it is
  output contract hardening

## Follow-on work

- `docs/method/backlog/asap/CORE_versioned-json-output-schemas.md`
