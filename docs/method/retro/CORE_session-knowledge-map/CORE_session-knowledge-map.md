# Retro: CORE_session-knowledge-map

## What shipped

`knowledge_map` MCP tool — answers "what do I already know?" by
querying the observation cache for files read, symbols inspected,
staleness flags, and per-directory coverage.

## Implementation

- `src/operations/knowledge-map.ts`: `buildKnowledgeMap(options)`
  iterates observation cache entries, checks staleness via content
  hash comparison, aggregates by directory.
- `src/mcp/tools/knowledge-map.ts`: MCP tool wrapper.
- `src/operations/observation-cache.ts`: added `allEntries()`
  iterator and `size` getter to support the query.

## Tests (5 operation + 7 agent-written)

Operation tests (mine):
1. Empty session → empty map
2. Observed files show symbol counts
3. Modified files flagged as stale
4. Unchanged files not stale
5. Multiple files across directories

Agent also wrote 7 MCP-level integration tests.

## What went well

- The observation cache already had everything needed. The new
  `allEntries()` iterator is the only addition to existing
  infrastructure.
- Staleness via hash comparison is elegant — no file-system
  timestamps needed.

## What to watch

- The tool reads file content from disk for every cached entry to
  check staleness. For large sessions (hundreds of files), this
  could be slow. Consider caching the hash check or doing it lazily.
