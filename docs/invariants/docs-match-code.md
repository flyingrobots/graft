# Docs match code at release

**Legend:** all

When a version is tagged, README.md, GUIDE.md, and VISION.md
reflect the current state of the codebase — correct tool counts,
feature descriptions, metrics, and roadmap.

## If violated

Users get misleading documentation. Setup instructions reference
features that don't exist or miss features that do. Trust erodes.

## How to verify

- Release flow includes doc regeneration step (VISION frontmatter
  metrics are updated by script; prose sections reviewed by agent)
- CHANGELOG has entries for all user-visible changes
