# METHOD

A backlog, a loop, and honest bookkeeping.

## Principles

The agent and the human sit at the same table. They see different
things. Both are named in every design. Both must agree before work
ships. Default to building the agent surface first — it is the
foundation the human experience stands on. If the work is
human-first exploratory design, say so in the design doc.

Everything traces to a playback question. If you cannot say which
question your work answers, you are drifting. Stop. Reconnect to
the design, or change it.

Tests are the executable spec. Design names the hill and the playback
questions. Tests prove the answers. No ceremonial layer between
intent and proof.

The filesystem is the database. A directory is a decision context. A
filename is an identity. Moving a file is a decision. `ls` is the
query.

Process should be calm. No sprints. No velocity. No burndown. A
backlog tiered by judgment, and a loop for doing it well.

## Structure

```text
docs/
  method/
    backlog/
      inbox/                        raw ideas, anyone, anytime
      asap/                         do this now
      up-next/                      do this soon
      cool-ideas/                   experiments, wild thoughts
      bad-code/                     tech debt
      *.md                          shaped work not in a named lane
    legends/                        named domains
    retro/<cycle>/<task>.md         retrospectives
    graveyard/                      rejected ideas
    process.md                      how cycles run
    release.md                      how releases work
  design/
    <cycle>/<task>.md               cycle design docs
    *.md                            living documents
```

Signpost documents live at root or one level into `docs/`. They use
`ALL_CAPS.md`. Deeper than that, they are not signposts.

## Backlog

Markdown files. Each describes work worth doing. The filesystem is
the index.

### Inbox

Anyone — human or agent — drops ideas in at any time. A sentence is
enough. No legend, no scope, no ceremony. Capture it. Keep moving.
The inbox is processed during maintenance.

### Lanes

- **`inbox/`** — unprocessed
- **`asap/`** — pull into a cycle soon
- **`up-next/`** — next in line
- **`cool-ideas/`** — not commitments
- **`bad-code/`** — it works, but it bothers you

Anything else sits in the backlog root. The backlog root holds shaped
work that matters, but does not currently belong in a named lane.

### Naming

Legend prefix if applicable. No numeric IDs.

```
VIZ_braille-rendering.md
PROTO_strand-lifecycle.md
debt-trailer-codec-dts.md
```

### Promoting

Pulled into a cycle, a backlog item becomes a design doc:

```
backlog/asap/PROTO_strand-lifecycle.md
  → design/<cycle>/strand-lifecycle.md
```

The backlog file is removed.

### Commitment

Pull it and you own it. It does not go back.

- **Finish** — hill met
- **Pivot** — end early, write the retro. Remaining work re-enters
  the backlog as a new item

### Maintenance

End of cycle:

- Process inbox. Promote, flesh out, or bury.
- Re-prioritize. What you learned changes what matters.
- Clean up. Merge duplicates, kill the dead.

Do not reorganize mid-cycle.

### Cycle types

Same loop regardless:

- **Feature** — design, test, build, ship
- **Design** — the deliverable is docs, not code
- **Debt** — pull from `bad-code/`. The hill is "this no longer
  bothers us"

## Legends

A named domain that spans many cycles. Each legend describes what it
covers, who cares, what success looks like, and how you know.

Legends do not start or finish. They are reference frames.

A legend code (`VIZ`, `PROTO`, `TUI`) prefixes backlog filenames.

## Cycles

A unit of shipped work. Design, implementation, retrospective.
Numbered sequentially.

Cycle directories use `<NNNN-slug>/`, for example
`0010-strand-speculation/`.

### The loop

0. **Pull** — choose. Move it. Committed.

1. **Design** — write a design doc in `docs/design/<cycle>/`.
   - Sponsor human
   - Sponsor agent
   - Hill
   - Playback questions — yes/no, both perspectives. Write them
     first.
   - Non-goals

2. **RED** — write failing tests. Playback questions become specs.
   Default to agent surface first.

3. **GREEN** — make them pass.

4. **Playback** — produce a witness. The agent answers agent
   questions. The human answers user questions. Write it down. The
   witness is the concrete artifact — test output, transcript,
   screenshot, recording — that shows both answers. No clear yes
   means no.

5. **PR → main** — review until merge.

6. **Close** — merge. Retro in `docs/method/retro/<cycle>/`.
   - Drift check (mandatory). Undocumented drift is the only
     failure.
   - New debt to `bad-code/`.
   - Cool ideas to `cool-ideas/`.
   - Backlog maintenance.

   Releases happen when externally meaningful behavior changes.
   Update CHANGELOG when externally visible behavior changed.
   Update README when usage, interfaces, or operator understanding
   changed.

### Outcomes

- **Hill met** — merge, close
- **Partial** — merge what is honest. Retro explains the gap
- **Not met** — cycle still concludes. Write the retro

A failed cycle with a good retro beats a successful one with no
learnings.

Every cycle ends with a retro. Success is not required.

## Graveyard

Rejected work moves to `docs/method/graveyard/` with a note. The
graveyard prevents re-proposing without context.

## Flow

```text
idea
  → inbox/
    → triage during maintenance
      → graveyard/
      → cool-ideas/
      → backlog root
      → up-next/
      → asap/
      → design/<cycle>/ (committed)
        → RED
        → GREEN
        → playback (witness)
        → retro/<cycle>/
        → release (when meaningful)
```

## What this system does not have

No milestones. No velocity. No ticket numbers.

The backlog is tiered by lane. Choice within a lane is judgment at
pull time. That is enough.

## Naming

| Convention | Example | When |
|---|---|---|
| `ALL_CAPS.md` | `VISION.md` | Signpost — root or `docs/` |
| `lowercase.md` | `doctrine.md` | Everything else |
| `<LEGEND>_<name>.md` | `VIZ_braille.md` | Backlog with legend |
| `<name>.md` | `debt-trailer-codec.md` | Backlog without legend |
| `<NNNN-slug>/` | `0010-strand-speculation/` | Cycle directory |
