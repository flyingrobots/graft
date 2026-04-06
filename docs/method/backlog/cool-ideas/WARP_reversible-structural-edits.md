# Reversible structural edits

Every structural edit through graft carries a witness — the
minimal data needed to invert the optic.

"Undo last refactor" doesn't require git revert. The witness
inverts the structural operation directly:

  invert(apply(S, rewrite), witness) = S

The receipt records the operational context. The witness records
the semantic inverse. They're different things.

This enables: structural undo, speculative edits with rollback,
agent "save points" that are cheaper than git commits.

Depends on: WARP optics (backlog), witness formalization.

See: aion-paper-07/optics/warp-optic.tex (Section 6)
