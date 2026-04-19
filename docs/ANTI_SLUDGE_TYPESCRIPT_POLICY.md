# Anti-SLUDGE TypeScript Policy

**Status:** Mandatory  
**Applies to:** all handwritten and LLM-generated TypeScript  
**Enforcement:** review + ESLint + Semgrep + CI shell checks  
**Default outcome for violations:** reject the patch

---

## 0. Purpose

This repository does not accept “technically valid” TypeScript that is vague, weakly modeled, architecture-free, or boundary-leaking.

TypeScript is not here to create the illusion of safety.
It is here to express **real domain concepts**, **explicit boundaries**, and **mechanically enforceable structure**.

If the code compiles but violates this policy, the code is wrong.

---

## 1. Architecture law: hexagonal or it is wrong

This codebase uses **hexagonal architecture**.

### Required layers
- **Domain**: pure business logic and domain types
- **Application**: orchestration and use-cases
- **Ports**: interfaces for external capabilities
- **Adapters**: implementations of ports and all interaction with external systems

### Dependency rule
Dependencies point inward only.

- `domain` depends on nothing external
- `application` may depend on `domain` and `ports`
- `ports` may depend on `domain` types where appropriate
- `adapters` may depend on `ports`, `application`, and external libraries
- `domain` must never import `adapters`
- `application` must never import `adapters`
- `domain` and `application` must never import HTTP/DB/framework/env/serialization concerns

### External effects belong in adapters
The following do **not** belong in `domain` or `application`:

- `fetch`
- database clients
- framework request/response objects
- `process.env`
- `Date.now()` / `new Date()`
- `Math.random()`
- filesystem access
- queue clients
- `JSON.parse` / `JSON.stringify`
- wire-format decoding
- logging libraries
- retry/backoff libraries

All of that belongs in adapters.

---

## 2. Banned sludge types

### Completely banned
- `any`
- `as any`
- `as unknown as`
- `FooLike`, `BarLike`, `ThingLike`, `DataLike`, `ResponseLike`, or any `*Like` placeholder type
- public APIs returning transport-native blobs instead of domain types
- index-signature-as-model design for domain entities
- giant generic helper abstractions that erase the actual domain
- DTO leakage into core logic
- `Function`, `object`, `Promise<any>`, `Array<any>`

### Boundary-only, never core
These may appear **only inside adapters before decode**:

- `unknown`
- `Record<string, unknown>`

They are temporary raw input containers only. They must be decoded immediately into explicit transport or domain types.

### Strongly discouraged and usually rejected
- `Partial<T>` for real domain object construction
- long `Pick<>` / `Omit<>` / `Required<>` chains that obscure meaning
- optional-property soup for lifecycle state
- boolean flag bags
- “result objects” with many optional fields and no clear state model

If the type has meaning, name it.

---

## 3. Model exact concepts, not shape approximations

### Bad
- `UserLike`
- `Record<string, unknown>`
- `Partial<Order>`
- `thing: any`
- `payload: unknown` in application code

### Good
- `User`
- `CreateOrderCommand`
- `OrderDraft`
- `PersistedOrder`
- `WebhookDecodeError`
- `ClockPort`

### Lifecycle states must be explicit
Do not represent state machines with optional fields and vibes.

Bad:

```ts
type Job = {
  id?: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  status?: string;
};
```

Good:

```ts
type PendingJob = { kind: 'pending'; id: JobId };
type RunningJob = { kind: 'running'; id: JobId; startedAt: Instant };
type FailedJob = { kind: 'failed'; id: JobId; startedAt: Instant; error: JobError };
type SucceededJob = {
  kind: 'succeeded';
  id: JobId;
  startedAt: Instant;
  finishedAt: Instant;
};

type Job = PendingJob | RunningJob | FailedJob | SucceededJob;
```

### Prefer discriminated unions over boolean sludge
Bad:

```ts
type SaveResult = {
  ok: boolean;
  retryable?: boolean;
  error?: string;
};
```

Good:

```ts
type SaveResult =
  | { kind: 'saved'; receipt: SaveReceipt }
  | { kind: 'rejected'; reason: ValidationError }
  | { kind: 'retryable_failure'; reason: TransientInfrastructureError };
```

---

## 4. Boundary discipline: decode once, then stay honest

This is a hard rule.

### Adapters may
- accept raw HTTP/JSON/DB/env/input
- decode raw values into explicit types
- call application/domain logic with decoded values
- encode domain results back into wire or storage formats

### Core may
- operate only on already-decoded values
- never parse raw transport data
- never inspect ad hoc object shapes from external systems

There must be a visible place where the raw world becomes the typed world.

No invisible shape drift.
No inline property poking in business logic.
No “just check a few fields here” sludge.

---

## 5. No conditional puddle assembly

LLMs love this sludge:

```ts
const thing: any = {};

if (input.a) thing.a = input.a;
if (input.b) thing.b = input.b;
if (input.c) thing.c = normalize(input.c);
```

That is not modeling. That is puddle assembly.

### Rule
Do not construct domain objects through scattered `if` blocks.
Use one of these instead:
- explicit decoder
- dedicated normalizer
- constructor with invariants
- domain factory returning a precise result type

Good:

```ts
function decodeCreateUserCommand(raw: RawCreateUserRequest):
  | { kind: 'ok'; value: CreateUserCommand }
  | { kind: 'decode_error'; field: string } {
  if (!isNonEmptyString(raw.email)) {
    return { kind: 'decode_error', field: 'email' };
  }

  if (!isNonEmptyString(raw.name)) {
    return { kind: 'decode_error', field: 'name' };
  }

  return {
    kind: 'ok',
    value: {
      kind: 'create_user_command',
      email: raw.email,
      name: raw.name,
    },
  };
}
```

---

## 6. Function design rules

### Name functions after intent
Bad:
- `handleData`
- `processThing`
- `transformResponse`
- `doStuff`

Good:
- `createInvoice`
- `admitPatch`
- `decodeWebhookPayload`
- `persistSettlementReceipt`

### No boolean positional arguments
Bad:

```ts
saveUser(user, true, false);
```

Good:

```ts
saveUser(user, { publishEvent: true, overwriteExisting: false });
```

### No mutation of inputs
Return new values or explicit result objects.
Do not patch caller-owned state.

### No throwing for expected failures
Expected failures must be modeled as return values.
Throw only for truly unrecoverable programmer bugs or impossible states.

### Exhaustiveness required
Switches over unions must be exhaustive.
Use an `assertNever` helper when appropriate.

---

## 7. Module design rules

### No junk drawers
These filenames are red flags and usually rejected:
- `utils.ts`
- `helpers.ts`
- `misc.ts`
- `common.ts`
- `types.ts` as a dumping ground
- `constants.ts` containing half the universe

Modules should be named after the concept they own.

### One file, one reason to exist
If a file mixes decoding, business rules, persistence, retries, and presentation, it is wrong.

### Do not hide boundaries with export carpets
Avoid giant barrel files that erase architecture. Imports should make layer crossings obvious.

---

## 8. Runtime honesty over compile-time theater

TypeScript does not validate runtime data.
Therefore:

- external data must be decoded at runtime
- internal logic must assume decoded inputs
- compile-time types must correspond to actual runtime guarantees

A cast is not validation.
It is a costume.

---

## 9. Determinism rule

Unless explicitly justified otherwise, core logic must be deterministic.

### Therefore banned in core
- wall-clock reads
- randomness
- ambient env reads
- hidden singleton state
- implicit global caches

Use ports instead:
- `ClockPort`
- `RandomPort`
- `ConfigPort`
- `IdGeneratorPort`

---

## 10. Preferred patterns

Preferred:
- pure domain functions
- explicit ports/adapters
- discriminated unions
- exact named types
- boundary-local decoders
- explicit result types
- composition over inheritance
- immutable data flow
- testable use-cases
- adapters that are thin and boring

Boring adapters are a compliment.

---

## 11. LLM generation rules

When generating code for this repository, the model must follow these rules:

1. Do not use `any`.
2. Do not use `unknown` except boundary-local raw input variables inside adapters.
3. Do not use `Record<string, unknown>` except boundary-local raw input variables inside adapters.
4. Do not invent placeholder types ending in `Like`, `ish`, `Data`, `Info`, or `Payload` unless they are precise transport types with a single boundary purpose.
5. Do not decode or encode inside domain/application code.
6. Do not construct objects through scattered conditional field assignment.
7. Do not introduce framework types into core logic.
8. Do not create `utils` or generic helper dumping grounds.
9. Do not use casts to force code through the compiler.
10. If the boundary shape is unclear, define a port or a transport type and stop there.

---

## 12. Automatic rejection criteria

Reject the patch immediately if it introduces any of the following in non-adapter code:

- `any`
- `unknown`
- `Record<string, unknown>`
- `as unknown as`
- `*Like` placeholder types
- `JSON.parse`
- `JSON.stringify`
- `fetch`
- `process.env`
- `Date.now()` / `new Date()`
- `Math.random()`
- DB clients or framework types in core code

Also reject if:
- decoding is mixed into business logic
- adapters leak transport shapes into core
- lifecycle state is modeled by optional-property soup
- a single file mixes architectural layers
- a cast is used where a decoder or explicit type should exist

---

## 13. Preferred project shape

```txt
src/
  domain/
    user/
      user.ts
      user-errors.ts
  application/
    create-user/
      create-user.ts
  ports/
    clock-port.ts
    user-repo-port.ts
  adapters/
    http/
      decode-create-user-request.ts
      encode-create-user-response.ts
    persistence/
      postgres-user-repo.ts
    config/
      env-config.ts
    time/
      system-clock.ts
```

---

## 14. Final rule

This policy is not advisory.

- “LLM wrote it that way” is not an excuse.
- “TypeScript allowed it” is not a defense.
- “Works for now” is not a quality bar.

If the code is vague, fake-safe, boundary-leaking, or architectureless, reject it.
