# `run_capture` policy boundary

`run_capture` currently shells out and can surface arbitrary file
content. Decide whether it is:

- an intentional escape hatch that is explicitly documented as outside
  bounded-read policy, or
- a retrieval surface that must be governed, redacted, or replaced

This should not remain implicit.

Done when:

- the product contract for `run_capture` is written down
- docs and tests match that contract
- invariant/readiness language stops overstating what the tool can do
