# Invariant: Activity View Stays Artifact-History Honest

**Status:** Planned
**Legend:** SURFACE

## What must remain true

Any human-facing between-commit activity view must present bounded local
`artifact_history` or explicitly degraded / unknown posture. It must
not imply canonical provenance, complete causal collapse, or total
since-commit capture that the current evidence does not support.

## Why it matters

The activity view is likely to become the first human-facing summary of
agent work between Git commits. If it overstates what Graft knows, the
human will treat an operational summary like durable provenance.

## How to check

- the surface names `artifact_history` or an equivalent bounded truth
  class
- anchor-to-commit posture is explicit or `unknown`
- degraded reasons remain visible when capture is incomplete
- docs and runtime surfaces do not present the first release as
  canonical provenance or causal collapse
