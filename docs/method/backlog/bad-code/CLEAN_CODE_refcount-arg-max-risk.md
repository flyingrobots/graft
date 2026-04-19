---
title: "reference-count passes all file paths as CLI arguments, risking ARG_MAX"
legend: CLEAN_CODE
lane: bad-code
---

# reference-count passes all file paths as CLI arguments, risking ARG_MAX

Source: design review exercise 2026-04-19

`runFilesWithMatches` in `src/warp/reference-count.ts` passes ALL tracked file paths as command-line arguments to ripgrep/grep. On repos with tens of thousands of files, this can exceed the OS `ARG_MAX` limit (typically 256KB on macOS, 2MB on Linux).

Fix: use ripgrep's built-in file discovery (`rg -w <symbol>` without explicit file list) or pipe file paths via stdin. For the grep fallback, use `xargs` or batch the file list.

Affected files:
- `src/warp/reference-count.ts` lines 48-94

Effort: S
