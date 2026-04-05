# WARP: Agent action provenance (Level 3)

Record agent reads and writes as WARP observations linked to
commits, files, and symbols. The causal chain of what the agent
saw before it wrote becomes the reasoning trace.

Possible graph shape:

  observation:uuid ─[reads]→ file:path
                  ─[at]→    commit:sha
                  ─[by]→    agent:id
                  intent: "why the agent read this"

  mutation:uuid ─[writes]→ sym:path:name
               ─[after]→  observation:uuid
               ─[at]→     commit:sha
               rationale: "why the agent changed this"

Open questions:
- Granularity: per-tool-call or per-session?
- Rationale capture: free text? structured? optional?
- Human writes: how to capture edits not made through agent tools?
- Storage cost: observations are high-frequency, need to be cheap
- Multi-agent: how do two agents' observation chains interleave?

This is the bridge from "what the code looks like" to "why the
code looks this way." Design cycle before any code.

Depends on: WARP Level 1 (this cycle), hooks integration.
See legend: WARP, Level 3.
