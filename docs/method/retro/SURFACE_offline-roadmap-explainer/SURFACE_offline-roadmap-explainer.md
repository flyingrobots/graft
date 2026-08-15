---
title: "Offline roadmap explainer artifact"
cycle: "SURFACE_offline-roadmap-explainer"
design_doc: "docs/design/SURFACE_offline-roadmap-explainer.md"
outcome: hill-met
drift_check: yes
---

# Offline roadmap explainer artifact Retro

## Summary

The roadmap explainer now has one self-contained local deliverable:
`Graft Two Roadmaps.html`. Its production stylesheet, bundled JavaScript,
generated roadmap data, and rendered sequence diagram are embedded in the HTML
itself. It executes under `file://`, initializes both Sugiyama graph
workbenches, and needs neither a server nor adjacent assets.

The authored Vite `index.html` remains the development entrypoint. When opened
from Finder it redirects to the standalone artifact, preventing recurrence of
the browser-default rendering that exposed this gap.

The first delivered standalone file placed the inlined production bundle in
the document head where Vite had emitted its deferred module tag. A classic
inline script is not deferred: Safari executed it before the graph containers
existed, leaving both viewers empty. The generator now places the bundle at the
end of the body, and the contract test fixes that ordering in place.

## Playback Witness

- [verification.md](./witness/verification.md)

## Drift

- The original cycle proved a production build and deterministic interactions,
  but called the explainer a local static deliverable without testing the exact
  file handed to the user under `file://`.
- Relative production assets were sufficient for an HTTP static server, not
  for the requested one-file offline artifact. The acceptance boundary is now
  explicit: no local asset dependency of any kind.
- The connected browser surface was unavailable. The cycle verifies file-URL
  execution, computed stylesheet application, and interactive behavior in a
  deterministic DOM, but does not claim screenshot-based visual inspection.
- James's direct Safari playback caught the empty-viewer ordering defect that
  the first deterministic harness concealed by constructing the DOM before it
  evaluated the bundle.

## What surprised you?

The initial symptom looked like a missing stylesheet, but changing the two
root-relative source paths would only have repaired CSS while leaving module
loading browser-dependent under `file://`. The correct unit of delivery was a
single inlined production bundle rather than a friendlier source entrypoint.

The first standalone generator also exposed a subtle JavaScript string-replace
hazard: minified bundle `$` sequences are interpreted in replacement strings.
Using function replacers and escaping embedded closing tags made the generated
HTML structurally exact.

## What would you do differently?

Test the artifact through the same gesture promised to the user. For an offline
HTML deliverable, that means opening the exact copied file under `file://`, not
only validating a development server and a production asset directory.

## New Debt

- None recorded.

## Cool Ideas

- None recorded.

## Follow-up Items

- Obtain James's direct Safari visual confirmation of the delivered file.
- Keep hosting repair or removal outside this explicitly local-only cycle.

## Backlog Maintenance

- [x] The reported local-delivery defect was fixed in this cycle.
- [x] No unrelated product or architecture debt was introduced.
- [x] No hosting state, roadmap task, issue, or milestone was changed.
