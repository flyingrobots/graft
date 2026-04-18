---
title: "Implement Bijou TUI for Graft daemon control plane"
legend: CORE
lane: up-next
---

# Implement Bijou TUI for Graft daemon control plane

# Why

Once the terminal control-plane surface is designed, the repo still
needs the shipping slice: command wiring, data loading, refresh model,
interaction bindings, and tests. Without an implementation card, the
design can sit as a nice idea while operators remain on raw command
sequences.

# Desired end state

- ship the first runnable Bijou daemon manager on the CLI surface
- reuse existing daemon control-plane truth instead of inventing a
  parallel state model just for the UI
- keep the TUI useful even when the daemon is absent: show a clear
  not-running state and support the same operator-friendly start or
  attach posture chosen for daemon-backed MCP bootstrap
- cover key flows with focused tests so the surface is more than an
  unverified demo

# Notes

- treat this as follow-on work after the design card
- keep parity with non-TUI CLI and MCP control-plane commands instead of
  making the TUI the only place an operator can act
- a small but honest first version is better than a graph-heavy surface
  that hides session and authorization truth
