---
title: "Structural test coverage map"
requirements:
  - "graft_map structural mapping (shipped)"
  - "file_outline symbol extraction (shipped)"
  - "code_refs reference search (shipped)"
acceptance_criteria:
  - "Given src/ and test/ directories, the tool reports which exported symbols have test references and which do not"
  - "Output explicitly labels coverage as structural/reference-based, not execution-based"
  - "Symbols with zero test references are flagged as uncovered candidates"
  - "The tool uses existing map/outline/search primitives without requiring instrumentation"
  - "False positive rate acknowledged: structural reference does not guarantee execution coverage"
---

# Structural test coverage map

Cross-reference the structural map of `src/` and `test/` to answer:
- which exported symbols appear to have direct test coverage
- which major symbols have no obvious test references

Prompted by external dogfood feedback:
- "cross-reference graft_map of src against graft_map of test"

Potential value:
- fast coverage triage without full semantic instrumentation
- better review hints for risky untested changes
- onboarding support: "what parts of this system are exercised?"

Constraints:
- this cannot claim true line or branch coverage
- first versions should be explicit that this is structural/reference
  coverage, not execution coverage

Why cool:
- uses existing map/search primitives
- could become a strong review or CI helper later

Effort: M
