---
title: "PR review comments are not actionability-typed"
feature: method
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 3
effort: M
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/73
---

# PR review comments are not actionability-typed

## Problem

PR automation emits a mixture of actionable findings, status comments, skipped
reviews, rate-limit notices, finishing-touch suggestions, and audit summaries.
Agents currently infer actionability from prose.

## Risk

Merge gates can either block on non-actionable noise or miss real issues hidden
among status comments. The Code Lawyer loop needs reliable classification.

## Desired Outcome

PR comments and review threads are classified into actionable, informational,
cooldown, and resolved categories before merge decisions.

## Acceptance Criteria

- Add a local helper or documented procedure for classifying PR comments.
- CodeRabbit rate-limit and path-filter messages are treated differently from
  actionable review findings.
- Self-audit activity summaries can reference the classification result.
- Merge-gate reports list only actionable unresolved blockers.
