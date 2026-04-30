# Retro: CORE_agent-handoff-protocol

## What shipped

`buildHandoff(options)` projects the observation cache into a
portable JSON payload: filesRead, symbolsInspected, observations,
budgetConsumed.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| Structured handoff JSON on session end | ⚠️ Function exists, not wired to lifecycle |
| Includes filesRead, symbolsInspected, filesModified, plannedButNotDone, budgetConsumed | ⚠️ Missing filesModified, plannedButNotDone |
| New session can ingest handoff | ❌ No ingest path |
| Projection over existing state | ✅ Reads ObservationCache |
| Preserves causal workspace identity | ❌ No causal data |

## Gaps

1. **Missing fields**: filesModified and plannedButNotDone not included.
2. **No ingest path**: One-way — produces but doesn't consume.
3. **No causal workspace**: sessionId is included but not causal chain.
4. **No lifecycle integration**: Caller must invoke manually.

## Drift check

- Uses ObservationCache.allEntries() correctly ✅
