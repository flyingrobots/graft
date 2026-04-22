---
title: Codebase signature (multi-axis observer vector)
requirements:
  - WARP Level 1 indexing (shipped)
  - Structural churn data (backlog)
  - Lagrangian policy framework (backlog)
acceptance_criteria:
  - "Each file/module has a multi-component signature vector: structural complexity, change velocity, coupling surface, export stability"
  - The signature replaces single-threshold policy with multi-axis characterization
  - An agent can query 'what kind of attention does this file need?' and receive the vector
  - No single scalar is used as a complete invariant of observer behavior
  - A test verifies that two files with different structural profiles produce distinct signature vectors
---

# Codebase signature (multi-axis observer vector)

Replace single-threshold policy with a multi-component vector per
file/module: structural complexity, change velocity, coupling
surface, export stability.

Instead of "how big is this file?" the agent asks "what KIND of
attention does this file need?"

No single scalar is a complete invariant of observer behavior
(OG-I No-Scalarization Theorem). The signature IS the observer
characterization.

Depends on: WARP Level 1 (shipped), structural churn data,
Lagrangian policy (backlog).
