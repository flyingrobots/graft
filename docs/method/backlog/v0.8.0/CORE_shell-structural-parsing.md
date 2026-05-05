---
title: "Shell structural parsing"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 13
effort: M
acceptance_criteria:
  - "`.sh`, `.bash`, and `.zsh` files are detected as structured formats"
  - "Outlines include functions, exported variables, sourced files, and high-risk command blocks when bounded"
  - "Fixtures cover setup scripts and CI helper scripts"
  - "Parser failures degrade safely for shell dialect edge cases"
---

# Shell structural parsing

Shell files are high-risk edit surfaces. Bounded structure is valuable
even when the extractor stays conservative.

## First slice

- Detect common shell suffixes
- Extract functions, exports, sourced files, and obvious script sections
- Avoid pretending to understand every shell dialect
