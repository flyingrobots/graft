---
title: "HCL structured config projection"
feature: language-breadth
kind: leaf
legend: CORE
lane: v0.8.0
priority: 17
effort: M
acceptance_criteria:
  - "Terraform/OpenTofu `.tf` and `.hcl` files are detected as structured formats"
  - "Outlines include resources, data sources, modules, variables, locals, outputs, and providers"
  - "Fixtures cover a small multi-resource infrastructure module"
---

# HCL structured config projection

Infrastructure files benefit from outline-first reads because raw HCL
often mixes critical resource declarations with noisy attributes.

## First slice

- Detect `.tf`, `.tfvars`, and `.hcl`
- Extract block labels and resource/module/provider structure
- Keep attribute expansion bounded
