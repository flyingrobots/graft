# Invariant: Address Is Not Identity

**Status:** Enforced (documentation + code review)
**Legend:** WARP

## What must remain true

Observer addresses (`sym:<path>:<name>`) are query surfaces, not
canonical semantic identity.

## Why it matters

Level 1 uses name/path addressability because it is cheap, simple,
and honest. A rename appears as one removal and one addition. That
is correct behavior for Level 1.

Level 2+ may add explicit continuity hints as separate relations
between old and new addresses, with confidence and basis spelled out.
That does not upgrade `sym:` addresses themselves into canonical
identity.

When canonical identity is available, it must be represented as a
separate identity anchor such as `sid:*`, not by pretending the
address key itself became stable identity.

If code or documentation starts treating these addresses as
ontological identity — relying on address stability across renames,
building persistent references keyed by address, or assuming
address continuity implies semantic continuity — the system will
break silently when symbols move.

Full identity across renames, moves, and structural refactors
belongs to Level 2+, where identity is derived from continuity of
structure and provenance.

## How to check

- Docs and code never describe Level 1 symbol keys as "identity"
- Rename handling surfaces as remove+add (not "moved")
- Any rename continuity appears as an additive continuity relation,
  not as proof that `sym:` addresses are stable identity
- Canonical identity, when present, is surfaced through a separate
  `sid:*` anchor or `identityId`, not by reinterpreting the `sym:`
  address as stable identity
- No persistent external references keyed by `sym:` addresses
  that assume stability across refactors
- Level 2+ is the only place identity continuity gets upgraded
