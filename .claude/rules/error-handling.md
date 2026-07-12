# Error handling

Two channels, chosen by whether the failure is an expected, normal-path outcome or a genuine bug.

- **Result type** — for expected "can't do that right now" outcomes: pathfinding finding no path,
  map generation given options that can't be satisfied, a malformed format string in `text.ts`'s tokenizer.
  ```ts
  type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
  const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
  const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
  ```
  Use plain early-return, never a chaining/monadic API (`.andThen()`, `.map()` on the Result itself). This is
  a deliberate choice: chain-style Result libraries clash with modern async/await idiom, and early-return reads
  clearer in this codebase.
  ```ts
  const result = doThing(...);
  if (!result.ok) return err(result.error);
  use(result.value);
  ```
- **Throw** — for genuine invariant violations / programmer bugs that valid calling code should never trigger
  (e.g. an out-of-range `topology` value in FOV computation, a corrupted RNG state passed to `setState`,
  an internal grid-index-out-of-bounds during map generation). If the type system is doing its job, these
  should not be reachable from correctly-typed call sites.
- Core algorithmic logic should not throw for expected failures — that's what Result is for. Reserve throw for
  the "this should be impossible" case.
