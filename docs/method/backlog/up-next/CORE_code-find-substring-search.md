# code_find substring search

Dogfood feedback from 2026-04-05 and 2026-04-07 says the structural
tools are good but `code_find` is still too exact-name-centric to act
as a real discovery tool.

Concrete failure:
- searching for `adapter` did not return classes with `Adapter` in the
  symbol name
- the user expectation was substring or light fuzzy matching
- the fallback became manual scanning via `graft_map`

Hill:
- `code_find` should be useful when the operator knows an approximate
  symbol name but not the exact casing or full identifier
- searching for `adapter` should find `GitWarpAdapter`,
  `ScenarioFixtureAdapter`, and similar symbols without requiring the
  exact token

Scope:
- define a default matching strategy for `code_find`
- decide whether matching should be substring, case-insensitive,
  prefix-biased, or explicitly mode-switched
- keep exact-match behavior inspectable and predictable
- add witnesses for expected discovery queries

Non-goals:
- opaque fuzzy ranking that makes results hard to explain
- silently broadening search in a way that makes precision unusable

Why now:
- this was the clearest direct product miss in external dogfooding
- fixing it improves the usefulness of the existing precision surface
  without requiring a new subsystem

Effort: M
