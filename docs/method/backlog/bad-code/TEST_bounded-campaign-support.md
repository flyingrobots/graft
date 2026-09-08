---
title: "Support bounded replayable test campaigns"
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

# Support bounded replayable test campaigns

## Problem

The inspected default Vitest/CI entry points at `e1d34c18` do not establish
repository-wide orchestration for recurring mutation, fuzz/generated,
schedule/fault, or calibrated performance experiments. This is a limited
enforcement inventory, not a claim that no individual target already has
such evidence.

## Bounded next delivery

Choose one high-risk target from its subsystem risk map. Inventory its existing
capabilities, then add only the missing bounded campaign scheduling and replay
artifact support. Retain build/configuration, seeds before randomized runs,
fixed schedules where used, reduction output, known counterexamples, and model
limits. Demonstrate a relevant failure and replay, not just a successful job.
Subsequent target-specific fuzz, scheduler, fault, or benchmark tooling requires
separate design; a full simulator and general mutation service are not assumed.

## Until implemented

Run the evidence relevant to each in-scope claim under the
[adoption record](../../../testing/adoption.md). Record actual execution,
recurrence, controls, and approved exceptions where necessary. Missing central
orchestration does not waive local calibration, controlled schedules, or corpus
replay. This card adds no inspector merge requirement.
