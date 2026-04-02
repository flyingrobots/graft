# Re-read suppression

Session-level observation cache in the MCP server. Track
`Map<path, { hash, timestamp }>`. When the agent reads the same
file twice and it hasn't changed, return "unchanged since your last
read" with the cached outline instead of re-reading and re-parsing.

Addresses the single biggest empirical finding from Blacklight:
WarpGraph.js was read 1,053 times across 85 sessions for 1.74 GB
of burden. Most re-reads find the same content.

No WARP dependency. Just a content hash comparison in the session.
This is the Level 2 observation cache from the WARP legend, but
the minimal version that works today.

Effort: S
