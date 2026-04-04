# Read range is bounded

**Legend:** CORE

`read_range` enforces a maximum of 250 lines per call. Requests
exceeding this cap are clamped or rejected.

## If violated

Agents can stealth-cat entire files by requesting large ranges,
defeating the governor's purpose.

## How to verify

- read-range tests assert cap enforcement
- The cap is a constant, not a parameter the agent controls
