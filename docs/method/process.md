# Process

How cycles run in Graft. See [METHOD.md](../../METHOD.md) for the
full philosophy.

## Starting a cycle

1. Pick work from the backlog. Move the file from its lane into
   `docs/design/<NNNN-slug>/` as a design doc.
2. Fill in the design doc: sponsor human, sponsor agent, hill,
   playback questions (yes/no from both perspectives), non-goals.
3. The design doc is reviewed until locked. No code until locked.

## The loop

```
Pull → Design → RED → GREEN → Playback → PR → Close
```

- **RED**: write failing tests. Playback questions become specs.
- **GREEN**: make them pass. Nothing more.
- **Playback**: produce a witness artifact (test output, transcript,
  recording). Both agent and human answer their questions.
- **PR**: review until merge-ready.
- **Close**: merge. Write retro in `docs/method/retro/<cycle>/`.

## Retro checklist

Every retro covers:

- [ ] Drift check — what changed that wasn't in the design?
- [ ] New debt → `docs/method/backlog/bad-code/`
- [ ] Cool ideas → `docs/method/backlog/cool-ideas/`
- [ ] Backlog maintenance — re-prioritize, merge duplicates, bury dead items

## Cycle types

- **Feature** — design, test, build, ship
- **Design** — deliverable is docs, not code
- **Debt** — pull from `bad-code/`, hill is "this no longer bothers us"

Same loop regardless of type.

## Releases

Not every cycle is a release. See [release.md](release.md).
