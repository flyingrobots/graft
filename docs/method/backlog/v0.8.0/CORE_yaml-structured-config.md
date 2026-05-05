---
title: "YAML structured config projection"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 14
effort: M
acceptance_criteria:
  - "`.yml` and `.yaml` files are detected as structured document formats"
  - "Outlines expose top-level keys and domain-specific anchors for GitHub Actions, Kubernetes, Compose, and OpenAPI when obvious"
  - "Large YAML files return bounded navigation instead of raw content"
  - "Fixtures cover at least GitHub Actions and Kubernetes-style YAML"
---

# YAML structured config projection

YAML is a repo control-plane surface. Graft should help agents navigate
jobs, resources, services, and API documents without dumping full files.

## First slice

- Detect `.yml` and `.yaml`
- Extract top-level keys and nested domain anchors
- Keep domain-specific handling additive and conservative

## Implementation status

- Pulled into `cycle/CORE_structural-test-coverage-map` with parser
  runtime detection, bounded top-level and nested mapping outlines, array
  shape summaries, and GitHub Actions fixture coverage.
