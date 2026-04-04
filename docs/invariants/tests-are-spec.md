# Tests are the spec

**Legend:** all

All tests passing means the system is correct. Tests are never
modified to make them pass — if a test fails, fix the code. If the
test itself is wrong, stop and alert the user.

Failing tests are written first (RED) for new features and bug
fixes. The test defines the contract before the implementation
exists.

## If violated

False confidence. Bugs ship because tests were weakened to
accommodate broken code. The test suite becomes decoration
rather than specification.

## How to verify

- CI runs full test suite on every push
- Pre-push hook runs tests locally
- Code review flags any test modifications that weaken assertions
