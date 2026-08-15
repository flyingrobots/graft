---
title: "Offline roadmap explainer artifact"
status: landed
cycle: "SURFACE_offline-roadmap-explainer"
owner: "James Ross"
---

# Offline roadmap explainer artifact

## Hill

A person can double-click one local HTML file for the Graft roadmap explainer
and receive the complete styled, interactive experience without a web server,
network access, adjacent assets, or build-tool knowledge.

## Problem

The explainer's authored `index.html` is a Vite development entrypoint. It uses
root-relative stylesheet and module paths that require an HTTP development
server. Opening that file through `file://` therefore exposes unstyled HTML and
does not initialize the Sugiyama graph workbenches. Calling the project a
static local deliverable without distinguishing that entrypoint was incorrect.

## Acceptance criteria

- A generated `Graft Two Roadmaps.html` contains its stylesheet, bundled
  JavaScript, roadmap data, and rendered sequence diagram in the file itself.
- The standalone document has no local stylesheet, script, image, module, or
  fetch dependency.
- Opening the authored `index.html` through `file://` redirects to the
  standalone artifact instead of exposing the development entrypoint.
- The standalone artifact retains both graph families, the 12/10-node Echo
  views, the 13/131-node managed views, inspectors, search, filters, zoom, fit,
  and keyboard dependency traversal.
- The existing HTTP development and production builds remain valid.
- A deterministic check fails if the standalone output regains a local asset
  dependency or omits the inlined CSS, JavaScript, or diagram.
- The file is visually inspected in a browser when the browser surface is
  available; any unavailable surface is reported rather than inferred.

## Playback questions

1. Can the exact delivered file be opened from Finder with no server running?
2. Does it look like the designed field guide rather than browser-default HTML?
3. Do both Sugiyama DAG workbenches initialize and remain interactive?
4. Could the file be copied alone to another offline directory and still work?

## Non-goals

- No change to either Graft roadmap, tracker state, or #228 implementation.
- No new web application framework or runtime service.
- No public hosting or hosting-access change.
- No repair of the previously created private deployment in this cycle.
- No second visual design or content rewrite.
