# TypeScript

- ESM only. No CommonJS unless there is an explicit, stated reason.
- Strict mode is always on (see `tsconfig.json`). Do not weaken compiler flags to make code compile.
- `any` is forbidden, implicit or explicit. If a type is genuinely unknown, use `unknown` and narrow it.
- Every exported function has an explicit return type.
- Prefer `readonly` on object/array fields and parameters wherever the value is not meant to be mutated by the callee.
- Prefer union types over `enum`.
- Use discriminated unions (a `type`/`kind` tag field) for branching logic instead of type casts or `instanceof` chains.
- `verbatimModuleSyntax` is on: use `import type` / `export type` for type-only imports and re-exports.
