# Release Witness: v0.2.1

## Discovery

- Repository type: JS/TS (pnpm)
- Package manager: pnpm, lockfile: pnpm-lock.yaml
- Version manifest: package.json
- Publishable unit: `@flyingrobots/graft` (npm — not yet registered)
- Previous tag: v0.2.0
- Branch: main
- HEAD synced with origin/main: yes

## Validation

| Step | Result |
|------|--------|
| pnpm lint | pass |
| pnpm test | pass (347 tests, 26 files) |
| pnpm publish --dry-run | pass (28.1 kB tarball, 41 files) |

## Tag and publish

- Release commit: `5dd2e0e`
- Tag: `v0.2.1` (annotated, signed)
- Push: `git push origin main v0.2.1` — success
- GitHub Release: https://github.com/flyingrobots/graft/releases/tag/v0.2.1
- npm: not published (org `@flyingrobots` not yet registered on npm)

## CI

- Sanity job: pass
- Release job: failed — `gh release create` returned 422 because the
  GitHub Release was manually created before CI ran. No functional
  impact; the release is live.

## Warnings

- GitHub Release was created manually via `gh release create` before
  CI had a chance to run. In future releases, let the tag push trigger
  CI to create the release automatically.
- Node.js 20 actions deprecation warning on CI — actions/checkout@v4,
  actions/setup-node@v4, pnpm/action-setup@v4 need updating before
  2026-09-16.
