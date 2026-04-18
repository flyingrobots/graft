---
title: "WARP symbol graph collides on duplicate names in same file"
legend: CLEAN_CODE
lane: bad-code
---

# WARP symbol graph collides on duplicate names in same file

Source: v0.6.0 code review (Codex Level 10)

`symNodeId(filePath, name)` cannot represent two symbols with the same name in one file (e.g. class methods `A.render` and `B.render`). The identity resolver uses `Map<string, string>` keyed by bare name, so duplicates are clobbered. The new `identityId` diff enrichment inherits this corruption.

Files: `src/warp/indexer-model.ts:47,55`, `src/operations/diff-identity.ts:15,35`, `src/warp/identity-resolver.ts:21`

Desired fix: symbol node IDs and identity maps must use qualified names (e.g. `ClassName.methodName`) or include kind/line-range disambiguation.

Effort: M
