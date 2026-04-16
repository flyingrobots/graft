---
title: "symbol query and precision tool seams"
legend: CLEANCODE
lane: bad-code
---

# symbol query and precision tool seams

`code_find`, `code_show`, `code_refs`, the shared precision helper, and precision query policy are all carrying variations of the same orchestration debt: request normalization, live-vs-WARP strategy, filtering, ranking, and response shaping are still too entangled. Consolidate this cluster into one symbol-query/precision seam so the remaining work is about shared execution strategy boundaries rather than five separate symptom notes.
