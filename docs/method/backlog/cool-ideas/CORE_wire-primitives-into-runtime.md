---
title: "Wire shipped primitives into the runtime"
feature: surface
kind: trunk
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "teaching-hints (shipped)"
  - "conversation-primer (shipped)"
  - "capture-range (shipped)"
  - "horizon-of-readability (shipped)"
acceptance_criteria:
  - "generateTeachingHint wired into governor responses (hint field)"
  - "buildConversationPrimer called at session bootstrap"
  - "CaptureHandleRegistry used by run_capture tool"
  - "detectReadabilityHorizon checked in projection pipeline"
---

# Wire shipped primitives into the runtime

Many implementations from this session are standalone primitives
not wired into the runtime. The functions exist and are tested
but don't actually fire during normal operation.

This card wires them in:
- teaching-hints → governor response pipeline
- conversation-primer → MCP session bootstrap
- capture-range → run_capture tool
- horizon-of-readability → projection decision pipeline

Small integration work, high value — turns dormant code into
active features.
