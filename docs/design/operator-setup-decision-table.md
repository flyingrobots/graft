---
title: "Cycle 0042 — Operator Setup Decision Table"
---

# Cycle 0042 — Operator Setup Decision Table

**Type:** Docs  
**Legend:** CORE

## Hill

When a new operator opens the setup docs, they can choose the correct
setup path in seconds instead of inferring it from scattered sections
about local vs global config, MCP vs hooks, and manual vs one-step
bootstrap.

## Playback Questions

### Operator

1. Can I quickly tell which command or config path applies to my
   client and setup mode?
2. Can I tell when to use `graft init --write-*` versus plain
   `graft init` versus manual global config editing?
3. Is the setup choice visible before I have to scroll through every
   per-client section?

### Maintainer

1. Does the decision aid stay aligned with the explicit `serve`
   transport startup?
2. Does README link directly to the decision aid instead of forcing
   readers to infer the right section?

## Scope

- add a concise setup decision table to `docs/GUIDE.md`
- link README quick-start guidance directly to that table
- close the consumed backlog item

## Non-goals

- changing setup mechanics
- adding new client bootstrap flags
- rewriting the whole setup guide

## Success Criteria

- `docs/GUIDE.md` contains a concise decision table near the top of the
  setup flow
- `README.md` links directly to that table
- the table matches the current `graft init --write-*` surface and the
  explicit `serve` transport contract
