# MCP daemon control-plane composition

`src/mcp/daemon-control-plane.ts` currently mixes several concerns in
one seam:

- persisted authorization storage
- capability-profile shaping
- live daemon-session registry
- daemon-wide status projection

That is acceptable for the first control-plane slice, but it should be
split before more monitor lifecycle or multi-repo behavior lands there.

Desired cleanup:

- separate persistent authorization storage from live session registry
- keep projection shaping thin and machine-readable
- avoid turning the control plane into a new daemon-side god object
