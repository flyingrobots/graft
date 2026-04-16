---
title: Monitors run through scheduler
legend: SURFACE
lane: graveyard
---

# Monitors run through scheduler

## Disposition

Addressed by the shipped daemon scheduler plus persistent monitor runtime; monitor ticks already run through the same scheduler and pressure model verified in 0087.

## Original Proposal

Requeued after being pulled active too early. This is the second half of the scheduler story and should stay behind 0068 so monitor execution moves onto a real scheduler instead of a hypothetical one.
