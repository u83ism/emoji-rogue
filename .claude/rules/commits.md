# Commit messages

- Written in Japanese.
- Must start with one or more Gitmoji.
- Format: `<emoji(s)> <one-line summary>`. Add a blank line and body text if more detail is needed.
- `🧑‍💻` is reserved for changes to `.claude/` (rules, skills, dev-environment config) — keep these commits
  separate from source-code commits even when done in the same session.
- One commit per logical unit of work (one tool swap, one subsystem conversion), not one giant commit.
  Structure multi-commit changes so every intermediate commit still builds.

## Gitmoji reference (see gitmoji.dev for the full/authoritative list)

| Emoji | Meaning |
|---|---|
| 🎨 | Improve structure / format of the code |
| ⚡️ | Improve performance |
| 🔥 | Remove code or files |
| 🐛 | Fix a bug |
| 🚑️ | Critical hotfix |
| ✨ | Introduce new features |
| 📝 | Add or update documentation |
| ✅ | Add, update, or pass tests |
| 🔒️ | Fix security issues |
| 🚨 | Fix compiler / linter warnings |
| 🚧 | Work in progress |
| ♻️ | Refactor code |
| ➕ / ➖ | Add / remove a dependency |
| 🔧 | Add or update configuration files |
| 🔨 | Add or update development scripts |
| ✏️ | Fix typos |
| ⏪️ | Revert changes |
| 🚚 | Move or rename resources |
| 💥 | Introduce breaking changes |
| 💡 | Add or update comments in source code |
| 🏗️ | Make architectural changes |
| 🏷️ | Add or update types |
| 🥅 | Catch errors |
| 🗑️ | Deprecate code that needs to be cleaned up |
| ⚰️ | Remove dead code |
| 🧪 | Add a failing test |
| 🧑‍💻 | Improve developer experience / `.claude/` and dev-tooling changes |
| 🦺 | Add or update validation code |
