---
title: "Init dry-run preview"
feature: surface
kind: leaf
legend: SURFACE
lane: cool-ideas
effort: S
requirements:
  - "CLI init write inventory"
  - "Idempotent init behavior"
  - "Editor integration documentation"
acceptance_criteria:
  - "`graft init --dry-run` reports every file it would create or update"
  - "`graft init --dry-run` does not modify the filesystem"
  - "The output distinguishes unchanged, would-create, and would-update paths"
  - "Tests cover a fresh repo and an already-initialized repo"
---

# Init dry-run preview

Source: 2026-05-04 code-quality and documentation-quality audit
cool-idea prompts.

## Problem

`graft init` is intended to be safe and idempotent, but cautious users
and agents still need a preview mode before allowing a command to write
instructions, hooks, or ignore files.

## Sketch

Add `--dry-run` to the init command. The command should compute the same
plan as a real init, then print the planned file actions without writing
anything.

Suggested action classes:

- `unchanged`
- `would-create`
- `would-update`
- `would-skip`

## Why This Matters

Dry-run output makes setup easier to trust in existing repositories. It
also gives docs a concrete way to demonstrate idempotent initialization.

## No Dependency Edges

This can ship independently of MCP hardening. It should not block the
architectural remediation designs.
