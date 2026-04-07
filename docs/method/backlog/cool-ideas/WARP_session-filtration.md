# Session filtration (accumulation-aware projections)

An observer's information grows monotonically over a session.
Graft should track what the agent has already seen and use that
to inform future projections.

If the agent already read the outline of parser/, a subsequent
safe_read of a file in parser/ could return MORE detail because
the outline context is already accumulated. Less context-setting
needed, more detail is valuable.

The agent's filtration has grown. Graft adapts.

This is the deepest OG insight applied to graft: the tool is
not about HOW MUCH to show. It's about what distinctions to
preserve, in what coordinate system, given what the agent
already knows.

Depends on: observation cache (shipped), session tracking
(shipped).

See: OG-I (filtration model of accumulated observation).
