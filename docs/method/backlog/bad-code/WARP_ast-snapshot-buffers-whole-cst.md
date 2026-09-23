---
title: "attachAstSnapshot materializes the whole CST as one JSON buffer"
feature: warp
kind: bad-code
legend: WARP
lane: bad-code
priority: 3
effort: M
status: open
reported: 2026-09-23
owner: flyingrobots
---

# attachAstSnapshot materializes the whole CST as one JSON buffer

## Problem and evidence

`attachAstSnapshot` (`src/warp/ast-emitter.ts`) walks the entire tree-sitter
CST into plain objects via `astSnapshotNode`, serializes that to JSON, and
wraps it in a `Buffer` before handing it to `patch.attachContent`:

```ts
const content = Buffer.from(JSON.stringify(astSnapshot(filePath, root)), "utf8");
```

Every leaf carries its own `text`, so the object graph is larger than the
source file and the JSON string larger again. For one file this is three full
copies live at once — object graph, string, buffer — at peak.

This was reviewed during the daemon memory-leak repair and is **not** a leak:
all three are unreachable once `attachContent` resolves, and the daemon's
monotonic growth was fully explained by unreclaimed property registers,
unbounded resident lifetime, per-parse parser construction, and disabled
compaction. Nothing retains the snapshot past the attachment.

It is still the largest transient allocation on the indexing path, and it
scales with file size rather than with a bound. Transient allocation at that
size drives heap high-water mark and fragmentation, which is what makes a
process's resident size stay high after the work is done.

## Bounded next delivery

Stream the snapshot rather than buffering it, or bound what gets serialized.
`attachContent` accepts `AsyncIterable<Uint8Array>` and `ReadableStream`
in git-warp 16 (OG-014 streaming content attachment), so an incremental
encoder can replace the three-copy peak without a format change.

Measure first: record peak RSS and allocation volume for the largest files in
a real repository before choosing between streaming, a depth or size cap, or
dropping leaf `text` that is recoverable from the source. Do not change the
`graft.ast-snapshot.v1` payload shape without a schema decision.

## Until implemented

Do not cite this as a leak. It is a peak-allocation concern, and any claim
about its impact needs a measurement, not an inference from its size.
