---
title: "SURFACE: Colorful prose extractor"
cycle: "SURFACE_colorful-prose-extractor"
design_doc: "docs/design/SURFACE_colorful-prose-extractor.md"
outcome: hill-met
drift_check: yes
---

# SURFACE: Colorful prose extractor Retro

## Summary

Implemented the Colorful prose extractor seam for Graft. Added a pure colorful.syntax/v1 IR projector, a Colorful CLI adapter behind ProcessRunner, opt-in buffer-native prose projection, MCP file_outline and large safe_read support for .txt files when colorful is available, public API/docs/changelog updates, and regression coverage for UTF-8 byte-range mapping, content/vocabulary hash rejection, projection bundles, and MCP tool behavior. Verified with targeted Vitest, pnpm typecheck, pnpm lint, git diff --check, and full Docker-isolated pnpm test.

## Playback Witness

Artifacts under `docs/method/retro/SURFACE_colorful-prose-extractor/witness`.

## What surprised you?

Nothing unexpected.

## What would you do differently?

No changes to approach.

## Follow-up items

- None.
