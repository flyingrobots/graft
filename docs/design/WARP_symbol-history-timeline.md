---
title: "Symbol history timeline surface"
legend: "WARP"
cycle: "WARP_symbol-history-timeline"
source_backlog: "docs/method/backlog/cool-ideas/WARP_symbol-history-timeline.md"
---

# Symbol history timeline surface

Source backlog item: `docs/method/backlog/cool-ideas/WARP_symbol-history-timeline.md`
Legend: WARP

## Hill

`code_show` can return the indexed WARP timeline for a symbol when a
caller requests `history: true`, and the CLI peer exposes the same
surface through `graft symbol show <symbol> --history`.

The core `symbolTimeline(ctx, name, filePath?)` query already exists.
This cycle completes the missing surface contract: MCP input schema,
CLI parser support, output schemas, policy refusal, and playback tests.

## Playback Questions

### Human

- [x] Can a human request symbol history from the same precision-read
      surface they already use for `code_show`?
- [x] Can a human see that history results are WARP indexed timeline
      facts, not current working-tree source snippets?
- [x] Can a human tell that explicit removed-symbol history still
      requires a path so the removed `sym:<path>:<name>` address is
      unambiguous?

### Agent

- [x] Does MCP `code_show` accept `history: true` and return ordered
      WARP timeline entries with commit SHA, tick, change kind,
      presence, signature, line range, and path?
- [x] Does `graft symbol show --history` route to the `code_show` peer
      with `history: true`?
- [x] Does `.graftignore` refusal still apply before symbol history is
      returned?
- [x] Does daemon offload keep history requests on the WARP-capable path
      instead of the live-only worker path?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: the response is a plain
  chronological array of structured entries.
- Non-visual or alternate-reading expectations: the timeline does not
  depend on visual position, charts, colors, or graphics.

## Localization and Directionality

- Locale / wording / formatting assumptions: response field names and
  change-kind tokens are stable ASCII API tokens.
- Logical direction / layout assumptions: history is ordered by WARP
  tick from older to newer.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: `source` is
  `warp`, `layer` is `commit_worldline`, and each entry carries the
  commit SHA plus WARP tick that produced it.
- What must be attributable, evidenced, or governed: history requests
  must respect the same path policy boundary as normal precision reads.

## Non-goals

- [ ] Claim canonical rename continuity when the current indexed address
      model only emits `added`, `changed`, and `removed` timeline
      entries.
- [ ] Combine `history: true` with `ref`; history is already a
      cross-commit indexed timeline.
- [ ] Return source snippets for every historical version in this
      surface.

## Scope

In scope:

- MCP `code_show` input schema accepts optional `history`.
- `code_show` history returns WARP timeline entries instead of source
  content.
- `graft symbol show` accepts `--history` and passes it to the MCP peer.
- Output schemas accept the `history` array for MCP and CLI peer
  responses.
- Explicit-path history checks path policy before returning WARP facts.
- Daemon dispatch does not offload history requests to the live-only
  `code_show` worker.

Out of scope:

- full canonical rename continuity across symbol names or file moves
- historical source-body hydration for every version
- broad temporal structural search predicates

## Rename Truth

The original cool-ideas card mentions renamed-symbol detection. This
surface does not invent that. The current timeline contract reports
`added`, `changed`, and `removed` over WARP `sym:<path>:<name>` address
history. Canonical rename continuity belongs to the identity model, not
to this surface wrapper.

That means this slice is still valuable: it makes the shipped timeline
query reachable through the advertised precision-read surface while
keeping the remaining identity work explicit.
