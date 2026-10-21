---
title: "Roadmap onto Echo retro"
cycle: PROCESS_roadmap-onto-echo
design_doc: ROADMAP.md
outcome: adopted-with-review-rulings
drift_check: yes
---

# Roadmap onto Echo retro

## What shipped

`ROADMAP.md` becomes Graft's adopted plan beyond the slices BEARING locks.

- Track A makes every answer state its terms. Track B moves Graft off
  git-warp onto Echo, with causal parts authored in Edict. Track C covers
  canonical identity, a resolved call graph, versioned neighbourhoods, cost
  marks and history links.
- The external review of 2026-10-21 is recorded under "Review rulings" and
  binds where it differs from the original proposal: the parity
  classification (principle 1), the six answer dimensions plus
  confidentiality (principle 3), the Edict boundary rule (principle 4), the
  new principle 6, B1 as one integration milestone whose process boundary is
  not a sandbox, A4b, and C4 deferred.
- The status records adoption, and lists as landed only A1 (#266), A3 (#267),
  A3b (#268) and A4 (#269). Everything else stays open.
- `AGENTS.md` lists `ROADMAP.md` in its documentation map.
- New card `docs/method/backlog/cool-ideas/CORE_agent-task-acceptance-corpus.md`,
  the review's third cool idea.

## Playback

- [x] Can a reader tell what is adopted and what is done? The status says
      adoption sets direction and order, and Track A names the four landed
      items with their PRs.
- [x] Do the rulings' boundaries survive adoption? The "Review rulings"
      section and the rewritten principles and rows are unchanged by the
      adoption edit; only status wording, landed markers and the parallel-start
      note changed.
- [x] Are references to work that is not on `main` marked as such? A2's card
      and the `CORE_unchanged-outline-notice` design are marked as not yet on
      `main`; A1 now points at its landed design packet instead of a card that
      was never committed.

## What the cycle got wrong first

- The roadmap was written as a proposal on a long-lived branch and the review
  packet landed before it. The A1, A3, A4 and `code_find` design packets on
  `main` cite "roadmap item A<n> on branch `claude/roadmap-echo`"; after this
  merge those items live in `ROADMAP.md` on `main`. The packets were not
  edited.
- The first draft cited an A1 card, `CORE_observation-cache-32-bit-content-hash`,
  as existing. It was never committed.
- There is no `docs/design/` packet for the roadmap itself: it is a planning
  document, and its review served as the design gate.

## Verification

- Full suite in the isolated Docker runner on the PR head; see the PR body.
- `tsc --noEmit`, `eslint .`, `git diff --check`: clean.
- The backlog DOT was regenerated for the new card and the SVG rendered from
  it in a container, since graphviz is not installed on the host.

## Follow-up

- The facts under "Where Graft stands" were checked against `main` at
  `1958a977` on 2026-10-19. They are not refreshed here; refresh them when
  the next track item is pulled.
- `docs/BEARING.md` does not yet point at the roadmap. Update it at the next
  BEARING revision, per `METHOD.md`.
- The migration design `docs/design/CORE_structural-history-schema-and-echo-migration.md`
  still says not to change public behavior unless a later packet authorizes
  it; it needs a short addition when B4 is designed, per principle 1.
