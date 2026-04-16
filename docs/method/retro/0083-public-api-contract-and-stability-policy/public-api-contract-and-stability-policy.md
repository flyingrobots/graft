---
title: "public api contract and stability policy"
cycle: "0083-public-api-contract-and-stability-policy"
design_doc: "docs/design/0083-public-api-contract-and-stability-policy/public-api-contract-and-stability-policy.md"
outcome: hill-met
drift_check: yes
---

# public api contract and stability policy Retro

## Summary

This slice made the direct package API an explicit release-reviewed
contract instead of an implied convenience export. The repo now names
the semver-public module path, groups the root export surface into
direct typed, bridge, host/runtime, and metadata families, and states
that deep imports into implementation paths are not public contract.
Release doctrine and the release runbook now classify public API
additions and breaking changes explicitly.

## Playback Witness

- [verification.md](/Users/james/git/graft/docs/method/retro/0083-public-api-contract-and-stability-policy/witness/verification.md)

## Drift

- None recorded.

## New Debt

- None recorded.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [x] Inbox processed
- [x] Priorities reviewed
- [x] Dead work buried or merged
