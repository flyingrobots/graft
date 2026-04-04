# Release Design: v0.2.1

## Included cycles

- **Cycle 0015** — Claude Code hooks (PreToolUse ban enforcement,
  PostToolUse education, shared module)
- **Cycle 0016** — Value objects (OutlineEntry, JumpEntry, DiffEntry,
  OutlineDiff, Tripwire as frozen SSJS classes)
- **Hardening** — trim-and-validate fix, edge case tests

## Hills advanced

- **CORE**: Claude Code agents are now governed at the hook level —
  banned files blocked before Read executes, large-file cost surfaced
  after Read completes.
- **CLEAN_CODE**: all domain types are now runtime-backed frozen
  classes with constructor validation. SSJS P1 migration complete.

## Sponsored users

- **Coding agents** (Claude Code): hooks enforce policy without
  requiring agents to opt in to the MCP server. Ban enforcement is
  automatic. Education nudges are contextual.
- **Graft adopters**: stronger runtime guarantees — malformed data
  cannot sneak through plain-object literals.

## Version justification

**Patch** (0.2.0 → 0.2.1). No new commands, no new reason codes, no
policy changes. The hooks are additive opt-in configuration. Value
objects are an internal hardening — the public API surface (MCP tool
inputs/outputs) is unchanged. Bug fixes (trim validation, UTF-8
safety, path traversal).

## Migration

No migration required. Hooks are opt-in via `.claude/settings.json`
(already committed to the repo). Value object changes are internal —
existing MCP tool consumers see no difference.
