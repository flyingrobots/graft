# Reactive workspace overlay

Make the workspace overlay reactive instead of only being inferred
between tool calls.

Scope:
- detect live local edits as they happen
- keep overlay state anchored to checkout epochs
- avoid turning branch switches into raw file-event spam
- stay clearly separate from the canonical commit worldline

Why separate cycle:
- this is where watcher semantics, batching, and repo-transition
  interpretation start to matter directly

Effort: L
