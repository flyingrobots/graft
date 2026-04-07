# Provenance and attribution instrumentation

Strengthen live-edit provenance beyond the current conservative
`unknown` / `low` fallback.

Scope:
- direct evidence for `agent`, `human`, and `git` attribution when
  available
- explicit confidence rules and downgrade paths
- inspectable evidence trails in user-facing output
- no false certainty when evidence is weak or mixed

Why separate cycle:
- attribution is a product trust problem, not just a data collection
  problem

Effort: L
