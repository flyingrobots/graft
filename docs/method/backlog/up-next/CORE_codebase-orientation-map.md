---
title: "Codebase orientation map"
legend: CORE
lane: up-next
---

# Codebase orientation map

`graft map` or `graft outline src/` — recursive structural outline
of an entire directory tree. Function signatures, class hierarchies,
export surfaces across all files. No function bodies.

New developer or agent joins a project, runs one command, gets
instant orientation. "Here's the shape of the codebase" in a few KB
instead of reading hundreds of files.

Could respect .graftignore and policy (skip vendor/, dist/, etc.)
for a curated view.
