---
title: "graft pack"
requirements:
  - "Session tracking (shipped)"
  - "State save/load (shipped)"
  - "Observation cache (shipped)"
acceptance_criteria:
  - "A single graft-pack artifact contains session state, touched file list, decision log, and suggested next reads"
  - "A receiving agent can load a graft-pack and resume work without re-reading already-observed files"
  - "Round-trip test: pack from session A, load into session B, verify session B has equivalent context"
  - "Pack format is serializable to a single file (JSON or NDJSON)"
---

# graft pack

One-shot handoff bundle: state + touched files + decisions + next
reads. For passing context between agents or sessions in a single
artifact.
