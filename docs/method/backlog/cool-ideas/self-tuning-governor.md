# Self-tuning governor

Analyze the NDJSON metrics log to suggest threshold adjustments.

- If 80% of outlines fire on files between 150–200 lines, suggest
  raising the line threshold.
- If a directory is always refused, suggest adding it to .graftignore.
- If the dynamic session cap never triggers, it might be too generous.
- If a specific file is re-read 50+ times, flag it as a hot path.

Could run as a `graft tune` command that reads the metrics and
emits suggestions, or as a periodic self-check in the MCP server.
