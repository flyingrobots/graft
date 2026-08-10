# Retro: v0.12.0 Release Security Gate

## Outcome

The v0.12.0 release graph again satisfies Graft's existing security policy:
zero critical and zero high npm advisories. The repair advanced only explicit
transitive overrides and did not migrate any direct dependency major.

## Playback

1. **Did the repository gate pass without muting advisories?** Yes.
   `pnpm security:check` reports `critical=0 high=0 moderate=1 low=2`.
2. **Are the formerly vulnerable packages pinned to patched versions?** Yes.
   `pnpm why` reports one version each: `tar@7.5.22`,
   `brace-expansion@5.0.9`, `fast-uri@3.1.5`, `hono@4.13.1`,
   `ip-address@10.4.0`, `postcss@8.5.26`, and `nanoid@3.3.18`.
3. **Did scope remain bounded?** Yes. No direct dependency or direct
   dependency major changed.
4. **Does the release surface still hold?** Yes. Lint, typecheck, and both
   release-surface test files pass.

## Findings

- The release failure was caused by the repository's own stale override table,
  not by an unavailable upstream patch.
- The security gate did its job: the critical `tar` advisory prevented a tag
  from being cut from an otherwise green package build.

## Debt and Ideas

No new backlog cards were filed. The remaining one moderate and two low
advisories are below the repository's release-blocking threshold and do not
justify broadening this release into a dependency migration.
