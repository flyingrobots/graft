# GitHub Issues visibility and METHOD backlog mirroring

Graft keeps **execution truth** in `docs/method/backlog/` and `docs/design/`.
GitHub Issues is the public entry layer for visibility, conversation, and
triage.

## Is this already done by METHOD MCP?

Not in this repo yet.

We currently have a `METHOD` process and MCP-compatible workflow data sources
for METHOD lane views, but there is **no native in-repo daemon/bridge that
auto-syncs GitHub Issues to `docs/method/backlog` and `docs/design`** yet.

For now, synchronization is manual and deliberate:

- issue opened or updated by humans
- maintainer mirrors intent to markdown cards/designs before implementation
- implementation work and retros continue in repo-native files

## Why this split exists

- Issues lowers the barrier for external contributors.
- Backlog cards preserve high-fidelity process (`asap`, design packet,
  red/green, retro, and release gates).
- The mapping keeps one source of truth without hiding the project from
  non-Method participants.

## Label and lane mapping

- `lane:asap` -> `docs/method/backlog/asap/`
- `lane:up-next` -> `docs/method/backlog/up-next/`
- `lane:bad-code` -> `docs/method/backlog/bad-code/`
- `lane:cool-idea` -> `docs/method/backlog/cool-ideas/`
- `p0`/`p1`/`p2`/`p3` -> severity in `docs/method/backlog/*` frontmatter

These labels are the initial bootstrap set to create:

```bash
gh label create "lane:asap" --description "Track in docs/method/backlog/asap"
gh label create "lane:up-next" --description "Track in docs/method/backlog/up-next"
gh label create "lane:bad-code" --description "Track explicit technical debt in docs/method/backlog/bad-code"
gh label create "lane:cool-idea" --description "Track non-blocking idea in docs/method/backlog/cool-ideas"
gh label create "scope:core" --description "Core system scope"
gh label create "scope:warp" --description "WARP ontology/path/causal scope"
gh label create "scope:surface" --description "MCP/CLI/daemon surface scope"
gh label create "scope:daemon" --description "Daemon runtime scope"
gh label create "p0" --color D73A4A --description "Critical risk"
gh label create "p1" --color D93F0B --description "High severity"
gh label create "p2" --color FBCA04 --description "Medium severity"
gh label create "p3" --color 0E8A16 --description "Low priority"
```

Run this through the repo command:

```bash
pnpm gh:issues
# or npm run gh:issues
```

You can also run:

```bash
pnpm gh:issues:check
# or npm run gh-issues:check
```

That command is intentionally conservative:

- It is idempotent for existing labels (updates description/color when present).
- It does not touch backlog cards or Issues content.
- It only initializes shared label vocabulary plus the shared mapping policy pointer.

## Issue intake flow

1. A contributor opens or updates an Issue using an issue template.
2. The maintainer creates/updates the corresponding backlog card in the mapped lane.
3. The design packet is opened in `docs/design/` before implementation
   starts, per `METHOD.md`.
4. Issue body and backlog card keep the same canonical summary.
5. When work is complete, close or transition the Issue based on the card state.

## Required fields to keep in sync

- Every tracked Issue should include:
  - A lane label that maps to one backlog source
  - A backlog path in the body (or "needs new card")
  - Clear severity for bad-code items
  - A concrete test strategy
- Every new backlog card should include issue linkage near the top:
  `issue: https://github.com/flyingrobots/graft/issues/<number>`

## Suggested issue template usage

Use the repository templates as the first-step onboarding layer:

- `01-feature-or-capability.md` -> features and parity gaps
- `00-bug-report.md` -> regressions and functional issues
- `02-bad-code.md` -> explicit technical debt cards
- `03-cool-idea.md` -> experiments and non-blocking ideas

If a contributor opens an Issue without a template, migrate the same
content into a matching card before implementation starts.

## PR triage cross-check

When opening a PR, include:

- source Issue URL (if any),
- created/updated backlog path(s),
- design packet path (if required by METHOD),
- what changed in terms of quality gates and tests.

## Operator quick command

Run `pnpm gh:issues` on first setup or when labels drift.
Run `pnpm gh:issues:check` to validate template/label and issue-backlog sync posture.
