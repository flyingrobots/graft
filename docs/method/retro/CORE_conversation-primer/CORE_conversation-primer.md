# Retro: CORE_conversation-primer

## What shipped

`buildConversationPrimer(options)` auto-detects scope (src/, lib/,
etc.), lists tracked files via git ls-files, returns a truncatable
file list.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| graft_map runs on default scope, injected into bootstrap | ❌ Lists files only, doesn't run graft_map |
| Agent oriented with directory structure, symbols, drill-down | ❌ File paths only, no symbols |
| Compact for small-context (configurable scope) | ✅ maxFiles option |
| Refreshes after writes or branch switches | ❌ No refresh mechanism |
| Configurable via .graftrc | ❌ Not implemented |

## Gaps

1. **Not a graft_map wrapper**: Just lists files via ls-files. Doesn't
   extract outlines or symbols. The card says "graft_map runs on a
   default scope" but graft_map wasn't invoked.
2. **No session lifecycle integration**: No bootstrap injection, no refresh.
3. **No .graftrc config**: Scope is auto-detected or explicit only.

## Drift check

- Uses GitClient, FileSystem, PathOps ports correctly ✅
- readdir for scope detection via port, not fs directly ✅
