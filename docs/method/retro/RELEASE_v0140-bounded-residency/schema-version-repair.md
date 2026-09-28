# Daemon-status schema release repair

Change kind: bug fix at the public MCP output-schema contract.

The new required resident field still selected the old strict validator.
The public JSON Schema regression failed on `2cf5146a`, expecting `2.0.0`
and observing `1.0.0`. The retained failure excerpt and exact command are in
`docs/method/releases/v0.14.0/witness/schema-version-red.txt`.

Version selection now advertises `graft.mcp.daemon_status` v2. The output
contract file passes 16/16, including full tool-response and CLI-peer checks.
Build and typecheck pass. The new pure-schema test has a one-second budget,
uses no I/O, and derives its literal expectation from the release contract.
No unchanged legacy test was removed or given a new expectation.

The reviewer also named a CLI JSON schema that is not registered. The attempted
CLI lookup in the first reproducer was a test setup error, not a product defect.
`graft daemon status` renders text and retains its existing health projection.
