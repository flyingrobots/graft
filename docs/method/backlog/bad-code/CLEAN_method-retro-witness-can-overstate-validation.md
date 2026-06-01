---
title: "Retro witnesses can overstate validation evidence"
feature: method
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 3
effort: M
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/72
---

# Retro witnesses can overstate validation evidence

## Problem

Manual retro recovery depends on agents accurately separating local validation,
remote CI evidence, CodeRabbit status, and drift checks. Without a structured
witness format, a retro can accidentally imply stronger validation than was
actually performed.

## Risk

The retro trail becomes less trustworthy. Future operators may read a witness as
proof of full local validation when only CI or focused checks ran.

## Desired Outcome

Retro witnesses record validation evidence in a structured, unambiguous way.

## Acceptance Criteria

- Witness templates distinguish local commands, remote CI checks, skipped
  checks, and known limitations.
- A retro that claims local validation names the exact command and result.
- Manual recovery retros include an explicit "automation failure" section when
  Method tooling times out or fails.
