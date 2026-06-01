---
title: "Code Lawyer local PR audit command"
feature: core
kind: cool-idea
legend: CORE
lane: cool-ideas
priority: 3
effort: L
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/80
---

# Code Lawyer local PR audit command

## Idea

Codify the Code Lawyer workflow as a local command that performs lockdown,
fetch, review-thread discovery, diff audit scaffolding, CI status collection,
and activity-summary generation.

## Why

The manual workflow is effective but repetitive. Repetition creates risk:
forgetting a GraphQL field, missing an unresolved thread, or mixing actionable
comments with status noise.

## Acceptance Criteria

- The command refuses to run on a dirty worktree.
- It fetches refs and reports auth failures clearly.
- It gathers unresolved review threads and PR comments.
- It prints a structured audit template.
- It can post a PR activity summary only with explicit operator intent.
