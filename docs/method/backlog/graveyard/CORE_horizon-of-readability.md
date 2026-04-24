---
title: "Horizon of readability"
feature: projection
kind: leaf
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "Compression ratio tracking (shipped)"
  - "file_outline tool (shipped)"
  - "Budget governor with projection decisions (shipped)"
acceptance_criteria:
  - "The governor detects when no projection can meaningfully reduce a file's size (outline is near content size)"
  - "When the horizon is reached, the governor returns full content instead of a degraded outline"
  - "The response explicitly tells the agent: 'This cannot be simplified further — full content provided'"
  - "Detection is based on measurable gradients (compression ratio, symbol density), not heuristics"
---

# Horizon of readability

Detect when no projection can reduce complexity further. The file
is irreducibly complex for the current representation.

Tell the agent explicitly: "This cannot be simplified further.
You must read the full content." The optimization boundary is
detectable, not a guess.

When gradients flatten — outline is barely smaller than content,
every symbol is dense, no range slice is self-contained — you've
hit the horizon. Stop trying to optimize and give the agent what
it needs.

Depends on: compression ratio (shipped), outline extraction.

## Implementation path

1. Define a "compression ratio" metric: `outline_size / content_size`. When this ratio approaches 1.0 (e.g., > 0.85), the outline provides negligible savings over full content.
2. Add a secondary metric: symbol density — number of top-level symbols per line. Files with very high density (every line is a distinct symbol) produce outlines that are essentially the full file.
3. Integrate these metrics into the governor's projection decision pipeline. Before deciding to outline-project a file, check if the outline would actually save meaningful context.
4. When the horizon is detected, override the projection to return full content with an explicit marker: `projection: content, reason: HORIZON_REACHED, message: "This file cannot be simplified further — full content provided."`
5. Cache horizon detection results per file path + content hash so repeated reads don't recompute.
6. Test with representative files: config files (high density, low savings from outline), large source files (low density, high savings), and edge cases (single-function files, files with only imports).

## Related cards

- **CORE_graft-as-teacher / CORE_graft-teach-learning-receipts**: When the horizon is reached, the teaching hint reinforces the decision: "full content is the right choice for this file." The horizon enriches teaching but neither card depends on the other.
- **CORE_self-tuning-governor**: Self-tuning could detect that a class of files consistently hits the horizon and suggest raising the outline threshold for that file type. Complementary analysis, not a dependency.
- **CORE_policy-playground**: Preview would show "this file would hit the readability horizon — full content projected." Independent but naturally composable.
- **WARP_adaptive-projection-selection**: Adaptive projection selects the best projection type per file. Horizon detection is a specific case: "no projection is better than content." If adaptive projection ships, horizon detection would be subsumed by it. Not a dependency — horizon detection is the simpler, more focused version.

## No dependency edges

All prerequisites are shipped. Compression ratio tracking and file_outline are already available. This card adds a decision rule inside the governor — no new infrastructure, no dependency on unshipped cards. No downstream card requires horizon detection as a hard prerequisite.

## Effort rationale

Medium. The concept is clear but the implementation requires careful calibration: choosing the right threshold for "outline is barely smaller than content," handling edge cases (files that are small enough to never outline anyway, files that are mostly comments), and avoiding false positives where the outline IS useful but the ratio is high. Testing across diverse file types (config, source, generated, documentation) adds validation surface beyond a simple S.
