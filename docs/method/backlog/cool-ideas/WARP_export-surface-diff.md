# Export surface diff

"What changed in the public API between two refs?"

Filter code_find to exported symbols only, compare at two
worldline positions. Shows added exports, removed exports,
and changed signatures.

API changelog generator. Breaking change detector. Pairs
naturally with semver: new exports = minor, removed exports
= major, changed signatures = check.

Depends on: WARP Level 1 (shipped), code_find (cycle 0024).
