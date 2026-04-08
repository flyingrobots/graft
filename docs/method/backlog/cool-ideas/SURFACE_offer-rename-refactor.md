# Offer rename as an explicit refactor surface

Graft should eventually be able to do more than explain symbol identity
or show references. When the evidence is strong enough, it should be
able to offer a rename operation as an explicit, inspectable refactor.

Hill:
- a human or agent can ask "should this be renamed?" or "rename this
  safely", and Graft can respond with a confidence-rated rename offer,
  affected references, and a previewable edit plan instead of a vague
  heuristic suggestion

Why separate from rename continuity:
- `WARP_symbol-identity-and-rename-continuity` is about ontology and
  historical continuity across changes
- this item is about the product surface: turning symbol identity,
  reference tracing, and policy boundaries into an explicit rename
  workflow

Needed first:
- stronger reference tracing than text fallback alone
- lawful confidence / ambiguity reporting
- a preview-first contract rather than silent edits

Effort: L
