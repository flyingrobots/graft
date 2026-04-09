# Invariant: Attribution Confidence Is Evidence-Bounded

**Status:** Planned
**Legend:** WARP

## What must remain true

No provenance surface may imply actor confidence higher than the
supporting evidence allows.

If evidence is weak, incomplete, or conflicting, the result must
downgrade to `medium`, `low`, or `unknown` rather than fabricating a
clean single-actor story.

## Why it matters

The product value of between-commit provenance depends on trust. If
Graft overstates attribution certainty, humans and agents will stop
treating the provenance layer as truthful.

## How to check

- actor attribution is always paired with explicit evidence
- confidence values are derived from evidence strength and conflict
- conflicting signals never surface as `high` confidence
- user-facing provenance views expose uncertainty instead of hiding it
