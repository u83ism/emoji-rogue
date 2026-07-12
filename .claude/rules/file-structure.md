# File structure

- `.ts`/`.tsx` files: aim for ≤150 lines; consider splitting past 200.
- Split a file once it holds more than one responsibility, regardless of line count.
- If a file exports 3 or more things, consider whether it should be split.
- One test file per source file, colocated: `foo.ts` → `foo.test.ts` in the same directory (not a separate
  `tests/` tree).
