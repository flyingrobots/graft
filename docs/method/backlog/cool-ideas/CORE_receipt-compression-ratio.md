# Receipt compression ratio field

Add a `compressionRatio` field to receipts:
`returnedBytes / fileBytes`. Gives an instant readability signal
for how much context was saved.

Example: `compressionRatio: 0.04` means the agent got 4% of the
file's raw bytes (a 96% reduction). Useful for Blacklight analysis
and for agents self-monitoring their context efficiency.

Null for non-file operations (doctor, stats, state_*).
