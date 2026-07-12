# Constraints

- No new dependency without a stated reason. Prefer a small amount of own code over a dependency that saves
  a handful of lines.
- No DI containers.
- No decorators.
- No OOP (classes, inheritance) unless the user explicitly asks for it in a specific case.
- No general-purpose terminal layout engine (Ink's `<Box>` flex layout, blessed widgets, etc.) for the map
  grid specifically — see `docs/design.md` and Stage 5 of the modernization plan for why: these engines do
  their own runtime wide-character width measurement, which this project deliberately avoids for the map
  grid by construction. Ink is fine to use for surrounding chrome (menus, status bars) that doesn't contain
  emoji.
