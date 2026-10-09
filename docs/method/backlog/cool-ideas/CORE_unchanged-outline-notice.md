---
title: "Unchanged outline notice — you already have it in your context bro"
feature: session
kind: trunk
legend: CORE
lane: cool-ideas
effort: S
requirements:
  - "Session-scoped observation cache (shipped)"
acceptance_criteria:
  - "First file_outline delivery returns the full outline and jump table"
  - "A repeated request for the same unchanged file in the same consumer context returns a compact already-delivered notice instead of the full payload"
  - "Changed bytes, a new consumer context, or an explicit resend request return the full current projection"
  - "Policy refusal is evaluated before duplicate suppression"
  - "A successful delivery is required; an internal cache hit alone does not prove delivery"
  - "Clients can recover the outline after compaction without modifying the file"
---

# Unchanged outline notice

User proposal: if the model asks for a file outline and the file has not
changed since its last request, say **"you already have it in your context bro"**
instead of spending context on the same outline again.

## Current behavior

`RepoWorkspace.fileOutline` checks the current observation against its cache.
A hit returns the cached outline and jump table in full with `cacheHit: true`.
The MCP handler sends those entries again. Parsing reuse currently saves
computation but does not suppress duplicate output.

## Proposed outcome and scope

Suppress repeated full `file_outline` payloads for an unchanged file that was
successfully delivered to the same consumer context. Return stable structured
status, path, and a reference to the prior projection, alongside the proposed
notice. Preserve a first delivery and all changed-file deliveries.

Track delivery separately from cache population: another operation can populate
the cache without delivering this projection. Keep repository, worktree, actor,
and consumer-context identity isolated. Hash the observed bytes rather than
trusting timestamps; still evaluate policy before returning any notice.

Graft can prove prior delivery, not continued presence in the model's context.
The design packet must choose an explicit resend mechanism and define how a
client signals compaction, context reset, or a different consumer sharing the
transport. Suppression must not trap a client that lost its earlier payload.

## Acceptance evidence for a future implementation

Exercise first delivery, same-byte repeat, changed bytes, another context,
policy change, a cache populated by another operation, failed delivery, and
explicit resend after simulated context loss. Assert stable response semantics
and absence of duplicate outline entries rather than incidental copy.

## Exclusions and prerequisites

This is a proposal, not a runtime change. No API or CLI behavior is changed by
this card. A design packet must settle the consumer-context and resend contract
before implementation; changes to a public output schema need compatibility
handling. No broader knowledge-map feature is required to land first.

Related: [Session knowledge map](CORE_session-knowledge-map.md). Both use
observation history, but a knowledge-map tool is not a prerequisite for this
single response behavior.
