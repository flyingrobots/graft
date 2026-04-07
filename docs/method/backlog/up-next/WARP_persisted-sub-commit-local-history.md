# Persisted sub-commit local history

Record meaningful local structural activity between commits without
pretending those events are the same as durable git history.

Scope:
- preserve workspace-overlay history across sessions
- decide what earns persistence versus what remains transient noise
- define the relationship between persisted local history and later
  commits
- keep the storage model inspectable and honest

Why separate cycle:
- this changes the effective product memory model, not just the event
  detector

Effort: XL
