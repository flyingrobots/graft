# Token usage: graft vs no-graft

Track actual token consumption with and without graft during
development. The tool's own build is the first test subject.

Approach: Blacklight already measures Read burden per session. Run
paired sessions — same tasks, one with graft enforcing policy, one
without. Compare context bytes, re-read frequency, outline-vs-content
ratio, and total session length.

The metrics logger already captures `estimatedBytesAvoided` per
decision. Aggregate that across a session and compare to Blacklight's
baseline numbers (96.2 GB across 1,091 sessions = ~88 MB/session
average).

This is how we PROVE graft works — not with synthetic benchmarks,
but with real sessions building graft itself.
