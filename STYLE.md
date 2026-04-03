# System-Style JavaScript

See the full standard in the global CLAUDE.md. This file documents
how it applies to Graft specifically.

## Status

Adopted as of cycle 0006. Existing code predates the standard.
New code follows it; existing code will be migrated incrementally.

## Graft-Specific Application

### Runtime-Backed Domain Types

Policy results, outline entries, diff entries, observations, and
receipts should be classes with constructors that establish
invariants — not plain objects or TypeScript interfaces cast from
`Record<string, unknown>`.

### Hexagonal Architecture

Core logic (policy engine, parser, diff algorithm) must not depend
on Node APIs directly. File I/O, git commands, and crypto belong
behind adapter ports.

Current state: core logic is tangled with node:fs, node:path,
node:child_process. Migration tracked in backlog.

### Boundary Validation

MCP tool handlers should parse arguments through schemas into
proper domain types — not cast `Record<string, unknown>` with `as`.

### Runtime Dispatch

Projection types (`content`, `outline`, `refused`, `cache_hit`,
`diff`, `error`) should be classes with `instanceof` dispatch,
not string tag switching.
