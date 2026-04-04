# Jump table ranges are valid

**Legend:** CORE

Every `JumpEntry` has `start >= 1` and `end >= start`. Line
numbers are 1-based (matching editor conventions and `read_range`
input).

## If violated

`read_range` receives garbage line numbers, returns wrong code
or crashes. Agents navigate to the wrong location.

## How to verify

- `JumpEntry` constructor validates `start >= 1` and `end >= start`
  (once converted to a class; currently validated by `buildJumpEntry`)
- Parser tests assert jump table entries have valid ranges for
  every fixture file
