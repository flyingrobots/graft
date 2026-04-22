---
title: "Policy profiles"
requirements:
  - "Budget governor (shipped)"
  - "Policy engine (shipped)"
  - ".graftrc configuration support (shipped)"
acceptance_criteria:
  - "At least three named profiles are available: balanced, strict, and feral"
  - "Profiles configure thresholds, ban lists, and outline verbosity"
  - "Profiles are switchable per session via CLI flag or per project via .graftrc"
  - "Custom profiles can be defined by users in .graftrc"
---

# Policy profiles

Named policy presets: balanced / strict / feral. Different thresholds,
different ban lists, different outline verbosity. Switchable per
session or per project via .graftrc or CLI flag.
