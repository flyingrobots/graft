---
title: "Verification Witness for the Offline Roadmap Explainer"
---

# Verification Witness for the Offline Roadmap Explainer

## Delivered Artifact

- File: `docs/explainers/graft-roadmaps/Graft Two Roadmaps.html`.
- Posture: self-contained local HTML, intended for direct Finder/Safari use.
- Embedded surfaces: stylesheet, production JavaScript bundle, roadmap data,
  and the rendered SVG sequence diagram.
- Required adjacent files: none.

## Offline Contract

`pnpm site:roadmaps:check` proves that the generated file:

- identifies itself as the self-contained offline artifact;
- contains inline stylesheet and JavaScript bundle markers;
- contains the sequence diagram as an SVG data URL;
- contains no external or local script source;
- contains no stylesheet link;
- contains no non-data image source;
- contains no relative local `src` or `href` asset path; and
- is the target of the source entrypoint's `file://` redirect.

Result:

```text
Roadmap explainer checks passed: self-contained offline artifact,
2 DAG families, 105 managed tasks, 6 closed tasks, 0 cycles.
```

## File-URL Interaction Contract

`pnpm site:roadmaps:test-interactions` loads the exact standalone HTML using a
`file://` URL, evaluates its inlined production bundle, and proves:

- the inlined stylesheet computes the designed header's grid layout;
- the 12-node Echo campaign and 13-node managed goalpost views initialize;
- the ten-node #228 proof and 131-node managed task views initialize;
- node selection and inspector updates work;
- search and status filters work;
- zoom and fit work;
- keyboard dependency traversal works; and
- textual dependency fallbacks remain populated.

Result:

```text
Offline roadmap interaction checks passed: inlined bundle, view switches,
131-node expansion, selection, search, filters, zoom, and keyboard traversal.
```

## Repository Gates

| Gate | Command | Result |
|---|---|---|
| Standalone production build | `pnpm site:roadmaps:build` | passed |
| Offline and graph contract | `pnpm site:roadmaps:check` | passed |
| File-URL interactions | `pnpm site:roadmaps:test-interactions` | passed |
| Repository lint | `pnpm lint` | passed |
| Repository types | `pnpm typecheck` | passed |
| Repository build | `pnpm build` | passed |
| Patch integrity | `git diff --check` | passed |

## Visual Evidence Boundary

Browser-runtime discovery returned no available browser. This witness therefore
claims file-URL execution, computed stylesheet application, and complete
scripted interactions—not screenshot-based visual inspection. James's Safari
confirmation remains the final human visual check.
