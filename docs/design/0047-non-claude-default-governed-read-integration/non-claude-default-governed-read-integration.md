# Non-Claude default-governed read integration

Source backlog item: `docs/method/backlog/up-next/SURFACE_non-claude-default-governed-read-integration.md`
Legend: SURFACE

## Sponsors

- Human: repo operator
- Agent: Codex

## Hill

Outside Claude's hook model, Graft should describe and bootstrap the
best honest governed-read posture it can actually provide. In this
cycle, that means an explicit client adoption matrix plus stronger
Codex bootstrap: `graft init --write-codex-mcp` should also seed
`AGENTS.md` guidance so Codex has both the MCP server and the repo-local
instruction layer that tells it to prefer graft reads.

## Playback Questions

### Human

1. If I bootstrap Codex in a repo, do I now get both the MCP config and
   a repo-local `AGENTS.md` instruction layer instead of only the MCP
   server block?
2. Do the setup docs clearly distinguish enforcement levels across
   Claude, Codex, and the other supported MCP clients?

### Agent

1. Is the non-Claude adoption contract explicit by client instead of
   implying that MCP availability equals governed reads?
2. Does `graft init` now treat Codex as a first-class bootstrap target
   rather than only scaffolding `CLAUDE.md`?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: present the client matrix
  as a flat table with explicit terms such as MCP available, instruction
  layer, and native-read guardrail
- Non-visual or alternate-reading expectations: keep AGENTS and setup
  guidance plain text and tool-name oriented so terminal and screen
  reader users get the same information

## Localization and Directionality

- Locale / wording / formatting assumptions: no locale-sensitive
  formatting; client names, paths, and command examples remain
  code-oriented English
- Logical direction / layout assumptions: left-to-right code and path
  formatting only

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: which setup path
  writes which config or instruction files, and what actual governance
  level each client gets today
- What must be attributable, evidenced, or governed: whether a client
  has native-read interception, repo-local instruction scaffolding, or
  MCP-only access with no read guardrail

## Non-goals

- [ ] implementing native-read interception for Codex, Cursor,
  Continue, Cline, or other non-Claude clients
- [ ] changing Claude hook semantics from cycle 0046
- [ ] claiming every supported MCP client is now default-governed

## Backlog Context

Cycle 0046 makes Claude hook-backed large JS/TS reads governed before
native `Read` can dump a whole code file into context. The remaining
default-read gap is now explicitly the non-Claude client surface:
Codex, Cursor, Continue, Cline, and any other MCP client where native
reads still bypass graft unless the agent remembers to opt in.

Hill:
- define the minimum honest integration contract for making graft the
  default read path outside Claude's hook model

Questions:
- what is the minimum viable integration for Codex, where hooks are not
  the current control point?
- which clients can support stronger governance versus prompt/bootstrap
  guidance only?
- how do we describe "default" honestly when a client exposes MCP but
  still retains native file reads outside graft control?

Deliverables:
- explicit per-client adoption matrix for non-Claude clients
- follow-on implementation plan for the highest-leverage client surface
- operator-facing docs that distinguish MCP availability from actual
  governed-read behavior

Non-goals:
- pretending one mechanism works uniformly across every editor or agent
- reopening Claude hook semantics unless new evidence says they are
  insufficient

Related:
- `docs/method/backlog/up-next/SURFACE_mcp-runtime-observability.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-mcp-daemon-and-workspace-binding.md`

Effort: L

## Scope

- extend `graft init --write-codex-mcp` so it also creates or merges an
  `AGENTS.md` graft guidance snippet
- keep default `graft init` behavior conservative while making the
  Codex explicit-write path stronger
- add a client adoption matrix to the setup docs that distinguishes MCP
  availability, instruction scaffolding, and native-read guardrails
- refresh README and GUIDE wording to stop implying that all clients
  have the same governed-read posture

## Success Criteria

- `--write-codex-mcp` writes or merges `.codex/config.toml`
  idempotently and also seeds `AGENTS.md` idempotently
- init tests cover the new Codex bootstrap behavior
- setup docs expose the current governance posture per client without
  overstating enforcement
- remaining non-Codex client follow-on work stays explicit in backlog
