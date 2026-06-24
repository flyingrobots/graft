# SURFACE: Colorful prose extractor

## Hill

Graft can project prose files through Colorful's `colorful.syntax/v1` IR so
agents and editor consumers receive the same syntax-span shape they already use
for source buffers.

## Problem

Graft currently treats `.txt` buffers as unsupported and derives Markdown
structure only from headings. Colorful now ships a Wesley-generated
`colorful.syntax/v1` contract and a `colorful ir` CLI that exposes token and
paragraph/sentence structure for prose. The next IR Spine slice needs Graft to
consume that contract without making jedit learn a separate prose projection
shape.

## Acceptance Criteria

- `.txt` files can produce Graft syntax spans from Colorful token roles.
- `.txt` files can produce a `file_outline` response from Colorful paragraph and
  sentence structure.
- Markdown keeps its existing heading outline behavior unless a caller explicitly
  asks for the Colorful prose projector.
- Colorful byte ranges are mapped to line/column points using UTF-8 bytes, not
  JavaScript UTF-16 string offsets.
- Graft rejects Colorful IR whose source hash or vocabulary hash does not match
  the bytes being projected.
- Tests do not require a live `colorful` binary; command execution remains
  behind the existing `ProcessRunner` port.

## Playback Questions

- Does a `.txt` projection bundle return `parseStatus.status === "full"` with
  `format === "prose"` instead of `UNSUPPORTED_LANGUAGE`?
- Do multibyte characters before highlighted tokens map to the correct row and
  column?
- Does a mismatched `contentHash` fail closed instead of projecting stale spans?
- Does `file_outline` expose paragraphs and sentences as Graft outline entries?
- Does the existing unsupported-buffer behavior remain available when Colorful
  is not configured?

## Non-goals

- Do not make Colorful a hard npm dependency of Graft.
- Do not add a new public jedit projection protocol.
- Do not replace Graft's existing Markdown heading outline by default.
- Do not claim semantic part-of-speech disambiguation beyond Colorful's shipped
  vocabulary roles.

## Test Strategy

- Unit-test the pure Colorful IR decoder/projector with fixture JSON and
  multibyte source text.
- Unit-test `StructuredBuffer` with an injected fake Colorful projector so
  `.txt` buffers return prose syntax and outline data.
- Unit-test `file_outline` with an injected fake `ProcessRunner` that returns
  Colorful JSON.
- Keep existing unsupported `.txt` tests by asserting unsupported behavior when
  no Colorful projector is configured.
