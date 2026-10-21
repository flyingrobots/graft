---
title: "Let operators mark .graftignore patterns as confidential"
feature: core
kind: cool-idea
legend: CORE
lane: cool-ideas
status: open
reported: 2026-10-21
---

# Let operators mark .graftignore patterns as confidential

`.graftignore` is a relevance control: `code_refs` counts matches in
`.graftignore`d files, by reason. That is right for generated, vendored and
data files, and wrong for files an operator lists because they are
confidential. Today the only confidential class is the built-in `SECRET` name
patterns.

Idea: a separate syntax or file (for example a `confidential:` prefix, or a
`.graftconfidential` file) whose patterns get content-denial treatment:
never searched, never counted, no sizes in refusals. The relevance and
content-denial distinction recorded in `docs/invariants/banned-never-leak.md`
already names the two treatments; this would let operators choose the second
one for their own patterns.

Open question: whether the existence of such files is itself confidential
metadata, which decides whether any count may ever be reported.
