---
title: "6 test files assert on implementation details instead of behavior"
legend: CLEAN_CODE
lane: bad-code
---

# 6 test files assert on implementation details instead of behavior

Source: test audit 2026-04-19

These tests verify internal state (file contents, source patterns) instead of exercising behavior through the public API:
- `unit/cli/init.test.ts` (487 LoC) — reads written files to verify content
- `playback/0058-system-wide-resource-pressure-and-fairness.test.ts` (358 LoC) — exercises internal state
- `playback/0088-target-repo-git-hook-bootstrap.test.ts` (240 LoC) — verifies file contents

Additionally 21 files have mixed behavior/implementation assertions.

Fix direction: call the function, check the return value or observable side effect. Don't readFileSync to verify something was written — test through the API that reads it back.

Effort: M
