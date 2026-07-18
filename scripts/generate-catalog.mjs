// Writes docs/catalog.md from the game's own data tables (single source of
// truth). Run via `npm run docs:catalog` (which builds dist/ first).
// catalog.test.ts enforces that the committed file matches the generator's
// output, so a balance change without regeneration fails `npm test`.
import { writeFileSync } from "node:fs";

const { buildCatalogMarkdown } = await import("../dist/game/index.mjs");

writeFileSync("docs/catalog.md", buildCatalogMarkdown(), "utf8");
console.log("docs/catalog.md regenerated");
