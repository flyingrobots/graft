---
title: "Automate testing evidence bookkeeping without replacing review"
feature: testing
kind: bad-code
legend: TEST
lane: bad-code
priority: 3
effort: M
status: open
reported: 2026-09-07
owner: flyingrobots
review_by: 2026-10-07
---

# Automate testing evidence bookkeeping without replacing review

## Problem

Testing Standards 1.0.0 requires claim calibration, preserved first failures,
owned quarantine/XFAIL decisions, exception expiry, and validated test
selection. The adoption establishes manual records and review; it does not
install a verifier, ledger service, or automated selection audit.

## Bounded next delivery

Start with preserving and linking first-failure evidence and detecting expired
owned records. Validate behavior using controlled failed/expired cases and
retained evidence. Expiry must request remediation or explicit risk acceptance,
never delete tests or close product defects. Follow with separate designs for
receipt validation and selection auditing where useful; never infer semantic
calibration from a checkmark or gate on a mutation/coverage score.

## Until implemented

The [adoption record](../../../testing/adoption.md) supplies the manual record
format, approval authority, and expiry behavior. Practical evidence is binding
now. This is automation debt, not blanket permission to omit evidence, and is
independent of the daemon inspector's release gates.
