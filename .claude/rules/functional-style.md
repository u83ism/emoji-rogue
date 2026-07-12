# Functional style

Functional Core, Imperative Shell: pure computation in the core, a thin effectful shell at the edges.

- No classes. No inheritance-based polymorphism (abstract base + subclasses). Use a shared function-shaped
  type (e.g. `type Fov = (originX, originY, radius, callback) => void`) plus an independent factory function
  per variant, instead of a class hierarchy.
- No DI containers. Dependencies are passed as plain function arguments, or via partial application
  (`createXWorkflow(port)`), never injected through a container or decorator.
- No shared mutable module-level state. If a factory needs internal mutable state, keep it inside a closure
  returned by the factory (e.g. `createMinHeap()` closing over an internal array) — that is fine, it's not
  global. What is forbidden is a value like the old `rng.ts` singleton (`export default new RNG()...`) that
  every importer mutates directly. See `src/rng.ts`'s `createRng(seed)` for the canonical example this rule
  exists to prevent recurring.
- Prefer `const` + arrow functions over `function` declarations.
- Minimize variable scope. Prefer `const` over `let`; avoid reassignment unless the value is genuinely a
  running accumulator inside a tightly-scoped loop.
- Naming signals purity:
  - Pure (same input → same output, no I/O, no `Date.now()`/`Math.random()`, no external state read):
    `calculate*`, `compute*`, `derive*`, `build*` (in-memory construction only), `map*`, `filter*`, `format*`,
    `parse*`, `toX`, `fromX`, `validate*`, `normalize*`.
  - Effect (I/O, wall-clock time, randomness, env vars): must be named with one of `fetch*`, `load*`, `read*`,
    `query*`, `save*`, `create*` (persistence-implying), `update*`, `delete*`, `write*`, `send*`, `emit*`.
  - A pure function must never use a forbidden-verb name, and vice versa.
- Events / notification-shaped data are plain discriminated unions (`{ type: "...", payload: {...} }`), never
  class instances.
