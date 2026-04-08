# Constructor-in-disguise detection

A `function buildFoo(...)` that returns `{ field1, field2, ... }`
is a constructor pretending to be a function. Graft can detect this
structurally:

1. Function name starts with `build`, `create`, `make`, `assemble`
2. Returns an object literal (not a class instance)
3. The returned shape has 3+ fields

Flag it: "buildFoo looks like a constructor — consider making Foo
a class."

Goes further with WARP: if the returned shape is consumed by other
functions that access its fields, those functions are behavior that
belongs on the class. Map the full dependency chain from the
constructor-in-disguise through its consumers and suggest the
class + method structure in one shot.

Could surface as a `graft doctor` check or as annotations on
`file_outline` entries.

Depends on: tree-sitter parsing (shipped), file_outline (shipped).
