# Release

Releases happen when externally meaningful behavior changes.

## Shaped Release

A shaped release is not just a tag plus a changelog edit. It is a
deliberate packet that says what is shipping, why this version number is
correct, which users benefit, and what they need to do next.

Required release artifacts:

- `docs/method/releases/vX.Y.Z/release.md`
  Internal release design and acceptance packet. It defines:
  - included shipped cycles or externally meaningful changes
  - hills advanced by the release
  - sponsored users affected and how they are helped
  - why this exact version number is justified
  - whether migration guidance is required
- `docs/method/releases/vX.Y.Z/verification.md`
  Internal release witness. It records discovery, pre-flight
  validation, tag/publish evidence, and direct verification of delivery.
- `docs/releases/vX.Y.Z.md`
  User-facing release notes and migration guide.
- `CHANGELOG.md`
  Historical ledger of externally meaningful behavior.

`CHANGELOG.md` remains the ledger. The user-facing guided release
surface lives in `docs/releases/`.

## When to release

- New commands or tools → release
- Policy changes that affect agent behavior → release
- Bug fixes → release
- Internal refactors with no behavior change → no release
- Documentation-only changes → no release

## Scope

Releases aggregate shipped work. They do not create
`docs/method/backlog/<version>/` directories, and they do not move
backlog items by version. Backlog lanes stay about priority and scope,
not release membership.

The release design names and justifies the intended version before
tagging. Commit history, diff inspection, and validation can support or
challenge that judgment during pre-flight, but they do not silently own
the decision by themselves.

## Version strategy

Semantic versioning. All packages in the monorepo (if it becomes one)
version in lock step.

- **Major**: breaking changes to the command surface, policy defaults,
  or MCP protocol.
- **Minor**: new commands, new reason codes, new policy options.
- **Patch**: bug fixes, performance improvements, hardening.

## Default

- Not every cycle is a release.
- Every cycle still updates the living docs honestly.
- Every release still needs a user-facing explanation, not just a
  ledger entry.
- `README.md` should point at durable release surfaces, not accumulate
  per-version sediment.

## Sequence

1. Shape the release in `docs/method/releases/vX.Y.Z/release.md`.
2. Accept the release scope and version justification before tagging.
3. Draft the user-facing release notes in `docs/releases/vX.Y.Z.md`.
4. Run the sequential pre-flight in `docs/method/release-runbook.md`.
5. Dogfood: sanity-check graft against itself before tagging.
6. Tag, publish, and verify delivery directly.
7. Ship sync repo-level surfaces that the release changed.

## Pre-1.0

Until 1.0, the command surface and policy defaults may change between
minor versions. Pin exact versions if stability matters.
