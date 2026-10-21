---
title: "Acceptance corpus built from agent tasks"
feature: core
kind: cool-idea
legend: CORE
lane: cool-ideas
status: open
reported: 2026-10-21
---

# Acceptance corpus built from agent tasks

Graft's acceptance evidence is organized by tool call. Agents do not work in
tool calls; they work in tasks.

Idea: an acceptance corpus built from agent tasks, such as "rename this
export safely", "find callers affected by this signature change", or
"explain why this unchanged function's behavior changed". Each task names the
facts an agent needs to complete it, and the corpus checks that Graft's
answers supply those facts with honest terms: basis, domain, coverage and
limitations, as `ROADMAP.md` principle 3 lists them.

This extends roadmap item A6, the invalidation fixture, from mutations to
tasks, and gives C1 to C3 (canonical identity, the resolved call graph and
versioned neighbourhoods) a measure of usefulness rather than only of
correctness.

Source: the 2026-10-21 external review of the A1/A3/A4 packet, cool idea 3.

Open questions: who writes the tasks and their expected facts, and how the
corpus avoids asserting incidental wording rather than the facts themselves
(`TESTING_STANDARDS.md`).
