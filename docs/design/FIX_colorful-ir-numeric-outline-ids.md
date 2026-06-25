# FIX: Colorful IR numeric outline IDs

## Hill

Graft accepts the real `colorful.syntax/v1` outline ID shape emitted by
`colorful >= 0.2.1`, so jedit and other Graft hosts can project `.txt` buffers
through the Colorful CLI without a local fixture-only type mismatch.

## Problem

Graft's Colorful prose projector validates `OutlineNode.nodeId` and
`childNodeIds` as strings. The Colorful GraphQL contract defines both fields as
`Int!`, and the public CLI emits JSON numbers. As a result, Graft successfully
discovers `colorful --version >= 0.2.1`, runs `colorful ir -`, then rejects the
valid IR before any projection reaches jedit.

## Acceptance Criteria

- Graft decodes `OutlineNode.nodeId: Int!` and `childNodeIds: [Int!]!` from
  `colorful.syntax/v1`.
- Graft normalizes valid integer IDs to its existing internal string-keyed
  outline maps without changing public outline entries.
- Graft rejects non-integer or negative outline IDs rather than accepting a
  looser pseudo-contract.
- Existing Colorful prose projection behavior remains unchanged for spans,
  outlines, jump tables, vocabulary hash checks, source hash checks, and CLI
  version gating.
- A real installed `colorful` CLI can feed Graft's Colorful CLI projector for a
  `.txt` buffer.

## Playback Questions

- Does the pure Colorful IR projector accept numeric paragraph and sentence IDs?
- Does the CLI adapter test use the same numeric ID shape as real
  `colorful ir` output?
- Do MCP `file_outline` and large `safe_read` text projections keep returning
  prose outlines after the fixture correction?
- Does Graft still fail closed when an outline node ID is not a non-negative
  integer?

## Non-goals

- Do not change the `colorful.syntax/v1` contract.
- Do not add Colorful as an npm dependency.
- Do not change jedit's projection protocol or Graft's public outline DTOs.
- Do not expand Colorful projection beyond `.txt` compatibility.

## Test Strategy

- Convert existing Colorful IR fixtures to numeric outline IDs.
- Add a decoder regression for invalid outline IDs.
- Run the focused Colorful projector, CLI adapter, and MCP text-projection tests.
- Run typecheck, lint, and whitespace validation before shipping.
