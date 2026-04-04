# Release Design: v0.2.2

## Included cycles

- **Cycle 0017** — JSON codec port (CanonicalJsonCodec with sorted
  keys, cycle detection, toJSON preservation)
- **Cycle 0018** — Dockerfile (run graft without installing Node)

## Hills advanced

- **CLEAN_CODE**: all JSON serialization goes through a codec port.
  Zero `JSON.stringify` in source. Deterministic output enables
  stable hashes and diffable logs.
- **CORE**: Docker-based MCP server startup. No Node install needed.

## Sponsored users

- **Docker users**: run graft as an MCP server with a single
  `docker run` command. No Node.js installation required.
- **Graft adopters**: canonical JSON output means stable receipts
  and reproducible metrics logs.

## Version justification

**Patch** (0.2.1 → 0.2.2). Codec port is internal refactoring —
no public API change. Dockerfile is a new deployment option, not a
new command or policy change.

## Migration

No migration required. Docker is a new option, not a replacement.
Existing `npx @flyingrobots/graft` usage is unchanged.
