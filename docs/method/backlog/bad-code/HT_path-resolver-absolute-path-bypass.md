---
title: "Path resolver passes absolute paths unchanged — security boundary is theater"
legend: HT
lane: bad-code
---

# Path resolver passes absolute paths unchanged

Source: v0.6.0 code review (Codex Level 10)

`createRepoPathResolver('/repo')('/etc/passwd')` returns `/etc/passwd`. Any absolute path input bypasses the traversal check entirely. The resolver only guards relative path traversal (../), not absolute path escapes.

Additionally, symlinks within the repo root are not resolved before the confinement check, so a symlink at `src/link → /etc/passwd` would pass the relative-path check.

Files: `src/adapters/repo-paths.ts:5`, `src/mcp/policy.ts:43`

Desired fix: absolute paths must be rejected or resolved relative to the project root. Symlinks must be resolved via `fs.realpathSync` before the confinement check.

Effort: S — but security-critical
