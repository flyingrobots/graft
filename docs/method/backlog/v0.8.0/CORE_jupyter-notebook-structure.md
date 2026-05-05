---
title: "Jupyter notebook structure projection"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 26
effort: M
acceptance_criteria:
  - "`.ipynb` files can produce output-stripped structural projections"
  - "Notebook outlines include markdown headings and Python declarations from code cells"
  - "Cell outputs are omitted from bounded read projections by default"
  - "Fixtures cover a small AI/data notebook with markdown and code cells"
---

# Jupyter notebook structure projection

Notebook support is a natural follow-up to Python because AI and data
repos often hide important structure inside `.ipynb` documents.

## First slice

- Detect `.ipynb` as a structured document format
- Parse notebook JSON with a structured parser, not ad hoc string scans
- Strip outputs and summarize markdown/code-cell structure
- Reuse Python outline extraction for code cells when parser runtime is
  available
