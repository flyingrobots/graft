---
title: runtime validated command and context models
legend: CORE
lane: up-next
blocked_by:
  - docs/design/0077-primary-adapters-thin-use-case-extraction/primary-adapters-thin-use-case-extraction.md
---

# runtime validated command and context models

Replace loose record bags and cast-shaped context objects at adapter boundaries with runtime-validated command, context, and result models. The goal is to make boundary truth and SOLID/DRY pressure align instead of relying on structural casts.
