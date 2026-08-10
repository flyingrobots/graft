# v0.12.0 Release Security Gate Verification

## Baseline

On `origin/main` at `87f1ab0e`, `pnpm security:check` failed with:

```text
audit summary: critical=1 high=11 moderate=14 low=3 info=0
release security gate: fail
```

The critical finding was `tar@7.5.13` through
`@git-stunts/git-warp > roaring > @mapbox/node-pre-gyp`.

## Verification

| Step | Command | Result |
| :--- | :--- | :--- |
| Lockfile | `pnpm install` | pass; eight packages replaced |
| Security gate | `pnpm security:check` | pass; critical 0, high 0 |
| Resolution | `pnpm why tar fast-uri brace-expansion hono ip-address nanoid postcss` | one patched version per package |
| Lint | `pnpm lint` | pass |
| Types | `pnpm typecheck` | pass |
| Public surface | `pnpm release:surface-gate` | 2 files, 10 tests pass |
| Whitespace | `git diff --check` | pass |

## Resolved Versions

- `tar@7.5.22`
- `brace-expansion@5.0.9`
- `fast-uri@3.1.5`
- `hono@4.13.1`
- `ip-address@10.4.0`
- `postcss@8.5.26`
- `nanoid@3.3.18`

The complete `pnpm release:check` remains a final-release-head gate after the
v0.12.0 version and release packet are prepared.
