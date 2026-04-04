# Release Witness: v0.2.2

## Discovery

- Repository type: JS/TS (pnpm)
- Previous tag: v0.2.1
- Branch: main
- HEAD synced with origin/main: yes

## Validation

| Step | Result |
|------|--------|
| pnpm lint | pass |
| pnpm test | pass (364 tests, 27 files) |
| pnpm publish --dry-run | pass (28.9 kB tarball, 43 files) |

## Dogfood

| Check | Result |
|-------|--------|
| doctor | parser healthy, thresholds correct |
| safe_read (small file) | projection: content |
| safe_read (large file, re-read) | projection: diff (CHANGED_SINCE_LAST_READ) |
| file_outline (canonical-json.ts) | 3 entries, jump table correct |
| stats | receipts tracking (8 reads, 2 outlines) |

## Tag and publish

- Release commit: `6be695f`
- Tag: `v0.2.2` (annotated)
- Push: `git push origin main v0.2.2` — success
- GitHub Release: created by CI from tag push
- npm: published by CI from tag push

## Warnings

- None
