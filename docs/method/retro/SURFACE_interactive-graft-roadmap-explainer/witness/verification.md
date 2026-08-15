---
title: "Verification Witness for the Interactive Graft Roadmap Explainer"
---

# Verification Witness for the Interactive Graft Roadmap Explainer

## Source Truth

- Snapshot date: 2026-08-15.
- Main evidence SHA: `68959cd63f1552b59cde1b8109a48793035f4dbc`.
- Active #228 design SHA: `24f2a975365a940a23be41db575678b3c884a58b`.
- Managed task inventory: 105 issues, contiguous from #97 through #201.
- Managed task state: six closed G0 tasks and 99 open G1-G12 tasks.
- Immediate Echo state: #228 is open, its design is recorded, and its
  implementation is unstarted; the unknown-basis substrate audit and RED proof
  are next.

## Graph and Data Proof

`pnpm site:roadmaps:check` verifies:

- 13 managed goalposts and exactly 105 managed task issues;
- the #97-#201 issue-number mapping and 6/99 status split;
- G0 task-complete/open-milestone drift and G1 active-frontier status;
- exact current native Echo blocker edges;
- valid endpoints and acyclicity for the Echo campaign, #228 proof, managed
  goalpost, and 131-node expanded task graphs;
- HTTPS evidence links;
- required progressive explainer sections and diagram-caption-table ordering;
- explicit `sugiyama()`, `layeringLongestPath()`, `decrossTwoLayer()`, and
  `coordSimplex()` layout stages;
- a rendered Mermaid SVG matching the companion Markdown source;
- relative static asset URLs and emitted JavaScript/CSS; and
- Worker navigation fallback without rewriting missing assets to HTML.

Result:

```text
Roadmap explainer checks passed: 2 DAG families, 105 managed tasks,
6 closed tasks, 0 cycles, static worker fallback verified.
```

## Interaction Proof

`pnpm site:roadmaps:test-interactions` executes the built interaction model in
a deterministic DOM and proves:

- initial 12-node Echo campaign and 13-node managed goalpost views;
- the ten-task #228 proof expansion with RED selected as next;
- the 131-node managed expansion containing 105 issues and 26 goalpost gates;
- node selection and inspector updates;
- text search and status filters;
- zoom and fit behavior;
- keyboard dependency traversal; and
- populated text dependency fallbacks.

Result:

```text
Roadmap interaction checks passed: view switches, 131-node expansion,
selection, search, filters, zoom, and keyboard traversal.
```

## Mermaid Render Proof

The sequence source was rendered rather than syntax-assumed:

```text
mmdc \
  -i docs/explainers/graft-roadmaps/diagrams/file-outline-retained-replay.mmd \
  -o docs/explainers/graft-roadmaps/public/diagrams/file-outline-retained-replay.svg \
  -b transparent \
  -t neutral

Generating single mermaid chart
```

The checked site then proves that the Markdown Mermaid block exactly matches
that rendered source.

## Build and Repository Gates

| Gate | Command | Result |
|---|---|---|
| Static production build | `pnpm site:roadmaps:build` | passed; HTML, CSS, JavaScript, Mermaid SVG, social card, Worker, and Sites metadata emitted |
| Graph/data contract | `pnpm site:roadmaps:check` | passed |
| Interaction contract | `pnpm site:roadmaps:test-interactions` | passed |
| Repository lint | `pnpm lint` | passed |
| Repository types | `pnpm typecheck` | passed |
| Repository build | `pnpm build` | passed |
| Patch integrity | `git diff --check` | passed |

## Accessibility Posture

- SVG graph nodes are keyboard-focusable buttons with readable labels and
  selected state.
- Enter and Space select; Left and Right follow incoming or outgoing edges.
- Search, filters, view switches, zoom, and fit use labeled native controls.
- Status and edge meaning use words and line patterns in addition to color.
- Every graph has a textual dependency list.
- The Mermaid sequence has descriptive alt text, an immediate collapsible
  caption, and a render-independent explanatory table.
- Narrow-screen and reduced-motion rules are present in the checked CSS.

The in-app Browser runtime reported no available browser instance. This witness
therefore claims deterministic DOM interaction and responsive CSS coverage, not
visual screenshot inspection or a real-browser accessibility audit.

## Social-preview Asset Provenance

- Asset: `docs/explainers/graft-roadmaps/public/og.png`.
- Generator: built-in ImageGen tool; one generation; no input images.
- Dimensions: 1672 × 941 PNG.
- Text was visually inspected and matches exactly:
  `GRAFT HAS TWO ROADMAPS` and `CAUSAL PROOF × MANAGED PRODUCT`.
- The prompt requested an ink-navy editorial systems map with teal and
  rust-orange paths converging at one junction, warm paper edges, safe social
  margins, exact typography, and no extra words, logos, or watermark.

## Publication Boundary

The site is configured for Sites with no D1 or R2 bindings. Deployment is a
Ship action after this Retro and the final closure gates. Private owner-only
deployment is preferred; no public access change is authorized by this cycle.
