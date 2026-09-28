---
title: "Daemon-root crash residue outside claim tombstones is never collected"
feature: core
kind: bad-code
legend: CORE
lane: bad-code
priority: 3
effort: S
status: open
reported: 2026-09-28
---

# Daemon-root crash residue outside claim tombstones is never collected

## Problem

PR #250 now collects stale-claim tombstones after a grace period and
`.released-*` claim directories whose holder died. Several other names the
root-ownership protocol creates beside `daemon-owner.json` can still be left by
a crash between two steps, and nothing removes them:

- `daemon-owner.json.claim.candidate-<claimId>`: a claim candidate directory,
  removed in a `finally` that a crash skips;
- `daemon-owner.json.candidate-<instanceId>-<uuid>`: an owner-record candidate
  file between its hard link and its unlink; and
- `daemon-owner.json.stale-<uuid>` and `daemon-owner.json.released-<uuid>`:
  quarantined owner records between their rename and their unlink.

Each is small and needs a crash at a precise point, so growth is slow.

## Risk

- Repeated crashes grow daemon-root state without bound, as the claim
  tombstones did before.
- A claim candidate belongs to a live contender while it is being published,
  so a naive sweep could delete another process's in-flight candidate.

## Desired Outcome

Each residue class has an owner-identity or age rule under which it is safe to
remove, collection runs while holding the root claim, matches exact generated
names with `lstat`, and never follows links, as the claim-tombstone collector
does.
