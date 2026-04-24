# Retro: CORE_graft-as-teacher

## What shipped

Implemented as part of unified teaching-hints module (cycle 15).
See retro: CORE_teaching-hints.

generateTeachingHint(ctx) returns contextual hints for suboptimal
read decisions: outline-projected → try file_outline, re-reads →
use changed_since, build output → read src/ instead, large files →
use read_range.

Deduplicated with CORE_graft-teach-learning-receipts — both cards
proposed the same feature from different angles.

## Tests (5)

See CORE_teaching-hints retro for full test list.
